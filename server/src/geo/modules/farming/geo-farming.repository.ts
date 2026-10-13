import type { GeoFarmAction, GeoFarmView } from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { CONTENT, FARMING } from "../../content";
import { isFarmingCardId } from "../../content/farming";
import { withTransaction, type TxQuery } from "../../db/transaction";
import { randomSeed } from "../../engine/rng";
import { accrue, FarmRuleError, newFarm, stepFarm, type FarmHandCard, type FarmState } from "../../farming/farm";
import * as playerRepository from "../player/geo-player.repository";
import { toFarmView } from "./geo-farming.view";
import { FIND_FARM_FOR_UPDATE, INSERT_FARM, UPDATE_FARM } from "./geo-farming.sql";

/** The player's farming hand: farming cards with charges left. */
async function loadHand(tx: TxQuery, playerId: string): Promise<FarmHandCard[]> {
    const handIds = await playerRepository.findHand(playerId, "farming", tx);
    const inventory = await playerRepository.findInventory(playerId, tx);
    const byId = new Map(inventory.map((row) => [row.id, row]));
    return handIds.flatMap((id): FarmHandCard[] => {
        const row = byId.get(id);
        const item = row ? CONTENT.items[row.item_id] : undefined;
        if (!row || item?.kind !== "card" || !isFarmingCardId(item.cardId) || (row.charges_left ?? 0) <= 0) return [];
        return [{ inventoryId: row.id, itemId: item.id, cardId: item.cardId, chargesLeft: row.charges_left ?? 0 }];
    });
}

/**
 * The player's farm, locked for this transaction, with the turns that came
 * in since it was last looked at. Made on first look.
 */
async function loadFarm(tx: TxQuery, playerId: string, now: Date): Promise<FarmState> {
    const [row] = await tx<{ state: FarmState }>(FIND_FARM_FOR_UPDATE, [playerId]);
    if (row) return accrue(row.state, FARMING, now);
    const fresh = newFarm(FARMING, randomSeed(), randomSeed(), now);
    const [inserted] = await tx<{ state: FarmState }>(INSERT_FARM, [playerId, fresh]);
    if (inserted) return fresh;
    // Made by a request racing this one: read theirs.
    const [raced] = await tx<{ state: FarmState }>(FIND_FARM_FOR_UPDATE, [playerId]);
    if (!raced) throw new Error("Farm insert raced and vanished");
    return accrue(raced.state, FARMING, now);
}

/** The farm as it stands, from anywhere. Saves the turns that came in. */
export async function findFarm(playerId: string): Promise<GeoFarmView> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        const state = await loadFarm(tx, playerId, new Date());
        await tx(UPDATE_FARM, [playerId, state]);
        return toFarmView(state, await loadHand(tx, playerId), await playerRepository.findSeedBag(playerId, tx));
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
        const state = await loadFarm(tx, playerId, new Date());
        const hand = await loadHand(tx, playerId);
        const seedBag = await playerRepository.findSeedBag(playerId, tx);

        let result;
        try {
            result = stepFarm(state, action, { crops: CONTENT.crops, config: FARMING, hand, seedBag: seedBag.contents });
        } catch (error) {
            if (error instanceof FarmRuleError) throw AppError.badRequest(error.message);
            throw error;
        }

        if (result.coins > 0) await playerRepository.spendCoins(tx, playerId, result.coins, "farm-tile", `tile:${action.type === "unlock" ? action.tile : ""}`);
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
        return toFarmView(result.state, handAfter, await playerRepository.findSeedBag(playerId, tx), {
            log: result.log,
            gained: result.gains,
            xpGained: result.xp,
        });
    });
}
