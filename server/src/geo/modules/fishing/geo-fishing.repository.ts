import type { GeoFishingAction, GeoFishingRunView, GeoFishingTier } from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { CHUM_BAIT_IDS, CONTENT, DEFAULT_ROD } from "../../content";
import { fishItemId, isFishingCardId, qualityFishItemId } from "../../content/fishing";
import { withTransaction, type TxQuery } from "../../db/transaction";
import { randomSeed } from "../../engine/rng";
import { fishingOdds } from "../../fishing/fishing";
import {
    FishingRuleError,
    newFishingState,
    stepFishing,
    type CastBait,
    type FishingHandCard,
    type FishingSetup,
    type FishingState,
} from "../../fishing/fishing-run";
import { playerModifiers } from "../../world/global-effects";
import * as playerRepository from "../player/geo-player.repository";
import { ABANDON_AFTER_MINUTES } from "../runs/geo-runs.repository";
import { ABANDON_STALE_RUNS, FIND_ACTIVE_RUN, FIND_RUN_FOR_UPDATE, INSERT_RUN, UPDATE_RUN } from "../runs/geo-runs.sql";
import { toFishingView } from "./geo-fishing.view";

/** A fishing Run's row in geo.runs: same table as combat, its own state. */
type FishingRunRow = {
    id: string;
    player_id: string;
    kind: string;
    status: string;
    state: FishingState;
};

/** The player's fishing hand, as the Run plays it: fishing cards with charges left. */
async function loadHand(tx: TxQuery, playerId: string): Promise<FishingHandCard[]> {
    const handIds = await playerRepository.findHand(playerId, "fishing", tx);
    const inventory = await playerRepository.findInventory(playerId, tx);
    const byId = new Map(inventory.map((row) => [row.id, row]));
    return handIds.flatMap((id): FishingHandCard[] => {
        const row = byId.get(id);
        const item = row ? CONTENT.items[row.item_id] : undefined;
        if (!row || item?.kind !== "card" || !isFishingCardId(item.cardId) || (row.charges_left ?? 0) <= 0) return [];
        return [{ inventoryId: row.id, itemId: item.id, cardId: item.cardId, chargesLeft: row.charges_left ?? 0 }];
    });
}

/** Rod, Fishing Power and odds, from the player's level and every modifier they have. */
async function loadSetup(tx: TxQuery, playerId: string): Promise<FishingSetup> {
    const fishingLevel = (await playerRepository.findSkillLevels(tx, playerId)).fishing ?? 1;
    const odds = fishingOdds(await playerModifiers(playerId, tx));
    return {
        rod: DEFAULT_ROD,
        power: DEFAULT_ROD.power + fishingLevel,
        seaCreatureChance: odds.seaCreatureChance,
        fish: CONTENT.fish,
    };
}

/**
 * Opens a fishing Run at water of `tier`, or resumes the one already open.
 * Refused mid-fight, or with no fishing cards in hand.
 */
export async function startFishing(playerId: string, tier: GeoFishingTier): Promise<GeoFishingRunView> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await tx(ABANDON_STALE_RUNS, [playerId, ABANDON_AFTER_MINUTES]);
        const [active] = await tx<FishingRunRow>(FIND_ACTIVE_RUN, [playerId]);
        const setup = await loadSetup(tx, playerId);
        if (active?.kind === "fishing") return toFishingView(active.id, active.state, setup);
        if (active) throw AppError.badRequest("You're in a fight. Finish or flee it first.");

        const hand = await loadHand(tx, playerId);
        if (hand.length === 0) {
            throw AppError.badRequest("Your fishing hand is empty. The Angler sells fishing cards.");
        }
        const state = newFishingState(tier, hand, randomSeed());
        const [row] = await tx<FishingRunRow>(INSERT_RUN, [playerId, "fishing", [], null, state]);
        if (!row) throw new Error("Run insert returned nothing");
        return toFishingView(row.id, state, setup);
    });
}

/**
 * One step: cast, wait, strike, a card… Saved with what it costs and gives
 * in one transaction: bait off the hook, card charges, and a landed fish into
 * the inventory with its fishing XP.
 */
export async function actFishing(playerId: string, runId: string, action: GeoFishingAction): Promise<GeoFishingRunView> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await tx(ABANDON_STALE_RUNS, [playerId, ABANDON_AFTER_MINUTES]);
        const row = await findOpenRun(tx, playerId, runId);
        const setup = await loadSetup(tx, playerId);

        // A cast takes the first packed bait, unless a perk saves it.
        let bait: CastBait = null;
        let baitSlot: { slot: number; itemId: string; from: number } | null = null;
        if (action.type === "cast") {
            const packed = (await playerRepository.findBait(playerId, tx)).contents
                .filter((entry) => entry.quantity > 0 && CONTENT.items[entry.itemId])
                .sort((a, b) => a.slot - b.slot)[0];
            if (packed) {
                bait = { itemId: packed.itemId, chum: CHUM_BAIT_IDS.has(packed.itemId) };
                baitSlot = { slot: packed.slot, itemId: packed.itemId, from: packed.quantity };
            }
        }

        let after: FishingState;
        try {
            after = stepFishing(row.state, action, setup, bait);
        } catch (error) {
            if (error instanceof FishingRuleError) throw AppError.badRequest(error.message);
            throw error;
        }

        if (baitSlot) {
            const odds = fishingOdds(await playerModifiers(playerId, tx));
            if (!(Math.random() < odds.baitSaveChance)) await playerRepository.useBait(tx, playerId, baitSlot);
        }

        for (const card of after.hand) {
            const previous = row.state.hand.find((entry) => entry.inventoryId === card.inventoryId);
            if (previous && previous.chargesLeft !== card.chargesLeft) {
                await playerRepository.setCharges(tx, playerId, card.inventoryId, card.chargesLeft);
            }
        }

        // The cast just ended with a catch: into the inventory, with its XP.
        const landed = after.phase === "over" && row.state.phase !== "over" ? after.result : null;
        if (landed?.kind === "landed") {
            const fish = CONTENT.fish[landed.fishId];
            if (!fish) throw new Error(`Unknown fish "${landed.fishId}"`);
            const itemId = landed.tier ? qualityFishItemId(fish.id, landed.tier) : fishItemId(fish.id);
            await playerRepository.grantItems(tx, playerId, [{ itemId, quantity: 1 }]);
            await playerRepository.addSkillXp(tx, playerId, "fishing", fish.xp);
        }

        await tx(UPDATE_RUN, [row.id, after, "active", null, null]);
        return toFishingView(row.id, after, setup);
    });
}

/** Leaves the spot: the Run ends, and the fishing hand is free to change again. */
export async function leaveFishing(playerId: string, runId: string): Promise<void> {
    await withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        const row = await findOpenRun(tx, playerId, runId);
        await tx(UPDATE_RUN, [row.id, row.state, "left", null, null]);
    });
}

/**
 * Ends an open fishing Run, e.g. walking off to start a fight. The caller
 * holds the player lock.
 */
export async function endOpenFishing(tx: TxQuery, row: { id: string; kind: string; state: unknown }) {
    if (row.kind === "fishing") await tx(UPDATE_RUN, [row.id, row.state, "left", null, null]);
}

async function findOpenRun(tx: TxQuery, playerId: string, runId: string): Promise<FishingRunRow> {
    const [row] = await tx<FishingRunRow>(FIND_RUN_FOR_UPDATE, [runId, playerId]);
    if (!row || row.kind !== "fishing") throw AppError.notFound("Fishing Run not found");
    if (row.status !== "active") throw AppError.badRequest("You've left that spot");
    return row;
}
