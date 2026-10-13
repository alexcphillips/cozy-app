import type { GeoFarmAction, GeoFarmView, GeoResearchRequest } from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { CONTENT, FARMING } from "../../content";
import { isFarmingCardId } from "../../content/farming";
import { withTransaction, type TxQuery } from "../../db/transaction";
import { randomSeed } from "../../engine/rng";
import {
    accrue,
    FarmRuleError,
    newFarm,
    seededLookup,
    stepFarm,
    upgradeFarm,
    type FarmHandCard,
    type FarmState,
    type StoredFarm,
} from "../../farming/farm";
import { realLookup, regionWeather } from "../../farming/weather";
import * as playerRepository from "../player/geo-player.repository";
import { toFarmView, type FarmWeather } from "./geo-farming.view";
import { FIND_FARM_FOR_UPDATE, INSERT_FARM, UPDATE_FARM } from "./geo-farming.sql";

type InventoryRows = Awaited<ReturnType<typeof playerRepository.findInventory>>;

/** How many of each item the player holds, for the Research Lab and structures. */
function heldItems(inventory: InventoryRows): Record<string, number> {
    const held: Record<string, number> = {};
    for (const row of inventory) held[row.item_id] = (held[row.item_id] ?? 0) + row.quantity;
    return held;
}

/** The player's farming hand: farming cards with charges left. */
async function loadHand(tx: TxQuery, playerId: string, inventory: InventoryRows): Promise<FarmHandCard[]> {
    const handIds = await playerRepository.findHand(playerId, "farming", tx);
    const byId = new Map(inventory.map((row) => [row.id, row]));
    return handIds.flatMap((id): FarmHandCard[] => {
        const row = byId.get(id);
        const item = row ? CONTENT.items[row.item_id] : undefined;
        if (!row || item?.kind !== "card" || !isFarmingCardId(item.cardId) || (row.charges_left ?? 0) <= 0) return [];
        return [{ inventoryId: row.id, itemId: item.id, cardId: item.cardId, chargesLeft: row.charges_left ?? 0 }];
    });
}

/** Where a farm's weather comes from: its home region's real weather, else seeded rolls. */
async function weatherFor(state: FarmState): Promise<FarmWeather> {
    const seeded = seededLookup(state.weatherSeed, FARMING);
    if (!state.home) return { lookup: seeded, source: "placeholder" };
    const hours = await regionWeather(state.home);
    return hours ? { lookup: realLookup(hours, FARMING, seeded), source: "real" } : { lookup: seeded, source: "placeholder" };
}

/**
 * The player's farm, locked for this transaction, with the turns that came
 * in since it was last looked at, and its weather. Made on first look.
 */
async function loadFarm(tx: TxQuery, playerId: string, now: Date): Promise<{ state: FarmState; weather: FarmWeather }> {
    const [row] = await tx<{ state: StoredFarm }>(FIND_FARM_FOR_UPDATE, [playerId]);
    let stored = row ? upgradeFarm(row.state) : null;
    if (!stored) {
        const fresh = newFarm(FARMING, randomSeed(), randomSeed(), now);
        const [inserted] = await tx<{ state: FarmState }>(INSERT_FARM, [playerId, fresh]);
        if (inserted) return { state: fresh, weather: await weatherFor(fresh) };
        // Made by a request racing this one: read theirs.
        const [raced] = await tx<{ state: StoredFarm }>(FIND_FARM_FOR_UPDATE, [playerId]);
        if (!raced) throw new Error("Farm insert raced and vanished");
        stored = upgradeFarm(raced.state);
    }
    const weather = await weatherFor(stored);
    return { state: accrue(stored, FARMING, now, weather.lookup), weather };
}

/** The farm as it stands, from anywhere. Saves the turns that came in. */
export async function findFarm(playerId: string): Promise<GeoFarmView> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        const { state, weather } = await loadFarm(tx, playerId, new Date());
        await tx(UPDATE_FARM, [playerId, state]);
        const inventory = await playerRepository.findInventory(playerId, tx);
        return toFarmView(state, await loadHand(tx, playerId, inventory), await playerRepository.findSeedBag(playerId, tx), heldItems(inventory), weather);
    });
}

/**
 * One farm action, saved with what it costs and gives in one transaction:
 * a seed out of the bag, a card's charge, coins for a tile, the harvest and
 * its farming XP.
 */
export async function actFarm(playerId: string, action: GeoFarmAction): Promise<GeoFarmView> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        const now = new Date();
        const { state, weather } = await loadFarm(tx, playerId, now);
        const inventoryBefore = await playerRepository.findInventory(playerId, tx);
        const hand = await loadHand(tx, playerId, inventoryBefore);
        const seedBag = await playerRepository.findSeedBag(playerId, tx);

        let result;
        try {
            result = stepFarm(state, action, {
                crops: CONTENT.crops,
                mutations: CONTENT.mutations,
                pests: CONTENT.pests,
                structures: CONTENT.structures,
                held: heldItems(inventoryBefore),
                config: FARMING,
                now,
                hand,
                seedBag: seedBag.contents,
            });
        } catch (error) {
            if (error instanceof FarmRuleError) throw AppError.badRequest(error.message);
            throw error;
        }

        if (result.coins > 0) await playerRepository.spendCoins(tx, playerId, result.coins, "farm-tile", `tile:${action.type === "unlock" ? action.tile : ""}`);
        for (const used of result.itemsUsed) await playerRepository.takeItems(tx, playerId, used.itemId, used.quantity);
        if (result.seedUsed) await playerRepository.useSeed(tx, playerId, result.seedUsed);
        if (result.cardPlayed) await playerRepository.setCharges(tx, playerId, result.cardPlayed.inventoryId, result.cardPlayed.chargesLeft);
        if (result.gains.length > 0) await playerRepository.grantItems(tx, playerId, result.gains);
        await playerRepository.addSkillXp(tx, playerId, "farming", result.xp);
        await tx(UPDATE_FARM, [playerId, result.state]);

        const handAfter = hand.flatMap((card) =>
            card.inventoryId !== result.cardPlayed?.inventoryId
                ? [card]
                : result.cardPlayed.chargesLeft > 0
                  ? [{ ...card, chargesLeft: result.cardPlayed.chargesLeft }]
                  : [],
        );
        const inventory = await playerRepository.findInventory(playerId, tx);
        // A new home region brings its own weather for the forecast.
        const weatherAfter = action.type === "home" ? await weatherFor(result.state) : weather;
        return toFarmView(result.state, handAfter, await playerRepository.findSeedBag(playerId, tx), heldItems(inventory), weatherAfter, {
            log: result.log,
            gained: result.gains,
            xpGained: result.xp,
        });
    });
}

/**
 * The Research Lab: the first of a mutation turned in records its recipe in
 * the journal and pays its reward, once. Works from anywhere.
 */
export async function research(playerId: string, { mutationId }: GeoResearchRequest): Promise<GeoFarmView> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        const { state, weather } = await loadFarm(tx, playerId, new Date());
        const mutation = CONTENT.mutations[mutationId];
        if (!mutation) throw AppError.badRequest("The Research Lab doesn't know that one");
        if (state.lab.includes(mutation.id)) throw AppError.badRequest(`${mutation.name} is already in the journal`);

        await playerRepository.takeItems(tx, playerId, mutation.produce, 1);
        state.lab.push(mutation.id);
        await playerRepository.addCoins(tx, playerId, mutation.research.coins, "research-lab", mutation.id);
        await playerRepository.addSkillXp(tx, playerId, "farming", mutation.research.xp);
        await tx(UPDATE_FARM, [playerId, state]);

        const inventory = await playerRepository.findInventory(playerId, tx);
        return toFarmView(state, await loadHand(tx, playerId, inventory), await playerRepository.findSeedBag(playerId, tx), heldItems(inventory), weather, {
            log: [`The Research Lab logged ${mutation.name}: its recipe is in the journal. +${mutation.research.coins} coins.`],
            gained: [],
            xpGained: mutation.research.xp,
        });
    });
}
