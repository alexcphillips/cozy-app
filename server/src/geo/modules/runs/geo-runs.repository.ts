import type { GeoDeathCause, GeoDeathResponse, GeoRewards, GeoRunResponse, GeoRunStatus } from "@cozy/shared/geo";
import { query } from "../../../db";
import { AppError } from "../../../http/AppError";
import {
    enemyCombatant,
    playerCombatant,
    rollChests,
    rollCoins,
    rollLoot,
    type Drop,
    type RolledChest,
} from "../../combat/combatants";
import { CONTENT } from "../../content";
import { withTransaction, type TxQuery } from "../../db/transaction";
import { BattleRuleError, canWield, createBattle, eatFood, playCard, type BattleResult } from "../../engine/battle";
import { MAGIC_FIND_STAT, type BattleState, type CardInstance, type LogEntry, type LunchboxSlot } from "../../engine/engine.types";
import { statOf } from "../../engine/stats";
import { createRng, randomSeed } from "../../engine/rng";
import * as chestsRepository from "../chests/geo-chests.repository";
import * as fishingRepository from "../fishing/geo-fishing.repository";
import * as playerRepository from "../player/geo-player.repository";
import * as worldRepository from "../world/geo-world.repository";
import { applyModifiers, globalModifiers } from "../../world/global-effects";
import {
    ABANDON_STALE_RUNS,
    FIND_ACTIVE_RUN,
    FIND_ACTIVE_RUN_FOR_UPDATE,
    FIND_RUN_FOR_UPDATE,
    INSERT_RUN,
    UPDATE_RUN,
} from "./geo-runs.sql";
import type { RunRow } from "./geo-runs.types";
import { toRunView } from "./geo-runs.view";

/** Loot gets its own RNG stream, so changing a loot table never changes a fight. */
const LOOT_SEED_SALT = 0x9e3779b9;

/** PLACEHOLDER: minutes of no turns before an active Run counts as fled. */
export const ABANDON_AFTER_MINUTES = 30;

export async function findActiveRun(playerId: string): Promise<GeoRunResponse | null> {
    await query(ABANDON_STALE_RUNS, [playerId, ABANDON_AFTER_MINUTES]);
    const [row] = await query<RunRow>(FIND_ACTIVE_RUN, [playerId]);
    // A fishing Run resumes from its own screen, not the fight's.
    return row && (row.kind as string) !== "fishing" ? { run: toRunView(row), log: [] } : null;
}

/**
 * Refuses while a Run is using the player's `skill` hand: the fight plays from
 * its own copy of that hand, so a card taken out of it now could be sold or
 * listed and still played. The caller must hold the player lock first.
 */
export async function assertHandNotInRun(tx: TxQuery, playerId: string, skill: string) {
    if ((await findLiveRun(tx, playerId))?.kind === skill) {
        throw AppError.badRequest("You can't change that hand mid-Run");
    }
}

/**
 * Refuses while the player is in any Run, with `message`. For things not to be
 * done mid-fight at all, like listing on the Market. The caller must hold the
 * player lock first, so a Run can't start alongside.
 */
export async function assertNotInRun(tx: TxQuery, playerId: string, message: string) {
    if (await findLiveRun(tx, playerId)) throw AppError.badRequest(message);
}

/** The Run in progress, once any left too long have been ended. */
async function findLiveRun(tx: TxQuery, playerId: string): Promise<RunRow | undefined> {
    await tx(ABANDON_STALE_RUNS, [playerId, ABANDON_AFTER_MINUTES]);
    const [active] = await tx<RunRow>(FIND_ACTIVE_RUN, [playerId]);
    return active;
}

/** The player's gear, talismans, combat hand and lunchbox, as the engine needs them. */
async function loadLoadout(tx: TxQuery, playerId: string) {
    // One after another: a transaction is one connection, and pg can't run
    // two queries on a connection at once.
    const equipment = await playerRepository.findEquipment(playerId, tx);
    const inventory = await playerRepository.findInventory(playerId, tx);
    const bag = await playerRepository.findTalismanBag(playerId, tx);
    const handIds = await playerRepository.findHand(playerId, "combat", tx);
    const packed = await playerRepository.findLunchbox(playerId, tx);

    const byId = new Map(inventory.map((row) => [row.id, row]));
    const worn = equipment.flatMap((slot) => byId.get(slot.inventory_id) ?? []);
    const equipped = worn.map((row) => row.item_id);
    const reforges = worn.flatMap((row) => (row.reforge ? [{ itemId: row.item_id, reforgeId: row.reforge }] : []));
    // Only the bag counts, and the bag holds one copy of each talisman.
    const talismans = bag.map((entry) => entry.item_id);

    const hand: CardInstance[] = [];
    for (const id of handIds) {
        const row = byId.get(id);
        const item = row ? CONTENT.items[row.item_id] : undefined;
        if (!row || item?.kind !== "card" || (row.charges_left ?? 0) <= 0) continue;
        hand.push({ instanceId: row.id, cardId: item.cardId, chargesLeft: row.charges_left ?? 0 });
    }

    // Food removed from the content since it was packed can't be eaten.
    const lunchbox: LunchboxSlot[] = packed.contents
        .filter((entry) => CONTENT.foods[entry.itemId])
        .map((entry) => ({ slot: entry.slot, foodId: entry.itemId, quantity: entry.quantity }));

    return { equipment: equipped, reforges, talismans, hand, lunchbox };
}

/** What a fight is against: a real spawn, or (dev only) an enemy by id. */
export type RunTarget = { enemyId: string; spawnId: string | null };

export async function startCombatRun(playerId: string, target: RunTarget): Promise<GeoRunResponse> {
    if (!CONTENT.enemies[target.enemyId]) throw AppError.badRequest("Unknown enemy");

    return withTransaction(async (tx) => {
        // Before reading the hand: a hand change can't land while this starts.
        await playerRepository.lockPlayer(tx, playerId);
        // Checked again inside the transaction: it may have gone or been won since.
        if (target.spawnId && !(await worldRepository.findLiveSpawn(tx, playerId, target.spawnId))) {
            throw AppError.badRequest("That enemy has moved on");
        }
        return openCombatRun(tx, playerId, target);
    });
}

/**
 * Starts a combat Run in the caller's transaction, e.g. a sea creature
 * hooked while fishing. The caller holds the player lock and has checked the
 * spawn, if any.
 */
export async function openCombatRun(tx: TxQuery, playerId: string, target: RunTarget): Promise<GeoRunResponse> {
    const { enemyId, spawnId } = target;
    if (!CONTENT.enemies[enemyId]) throw new Error(`Unknown enemy "${enemyId}"`);
    await tx(ABANDON_STALE_RUNS, [playerId, ABANDON_AFTER_MINUTES]);
    const [active] = await tx<RunRow>(FIND_ACTIVE_RUN, [playerId]);
    // Walking off from a fishing spot to fight leaves the spot.
    if (active && (active.kind as string) === "fishing") await fishingRepository.endOpenFishing(tx, active);
    else if (active) throw AppError.badRequest("You're already in a Run. Finish or flee it first.");

    const player = await playerRepository.findPlayer(playerId, tx);
    if (!player) throw AppError.notFound("Player not found");
    const loadout = await loadLoadout(tx, playerId);
    if (loadout.hand.length === 0) throw AppError.badRequest("Your combat hand is empty");

    const combatLevel = (await playerRepository.findSkillLevels(tx, playerId)).combat ?? 1;
    const you = playerCombatant(
        { name: player.displayName, ...loadout, combatLevel, globalModifiers: await globalModifiers(tx) },
        CONTENT,
    );
    // Else the fight could only be fled.
    if (!loadout.hand.some((card) => canWield(CONTENT.cards[card.cardId]!, you.weaponTags))) {
        throw AppError.badRequest("None of the cards in your hand can be used with your weapon");
    }

    const enemyIds = [enemyId];
    const { state, log } = createBattle(
        [
            you,
            ...enemyIds.map((id, index) => enemyCombatant(id, index, CONTENT)),
        ],
        randomSeed(),
        CONTENT,
    );

    const [inserted] = await tx<RunRow>(INSERT_RUN, [playerId, "combat", enemyIds, spawnId, state]);
    if (!inserted) throw new Error("Run insert returned nothing");
    // A battle can, in principle, end before the player acts.
    return settle(tx, inserted, inserted.state, state, log);
}

/** A turn: a card from the hand, or a food from a lunchbox slot. */
export type TurnPlay = { inventoryId: string; targetId?: string } | { lunchboxSlot: number };

export async function playTurn(playerId: string, runId: string, play: TurnPlay): Promise<GeoRunResponse> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        // A Run left too long is over, here as everywhere else: its hand is
        // free to change again, so it mustn't be played on.
        await tx(ABANDON_STALE_RUNS, [playerId, ABANDON_AFTER_MINUTES]);
        const [row] = await tx<RunRow>(FIND_RUN_FOR_UPDATE, [runId, playerId]);
        if (!row) throw AppError.notFound("Run not found");
        if (row.status !== "active") throw AppError.badRequest("That Run is over");

        let result: BattleResult;
        try {
            result =
                "lunchboxSlot" in play
                    ? eatFood(row.state, CONTENT, { slot: play.lunchboxSlot })
                    : playCard(row.state, CONTENT, { cardInstanceId: play.inventoryId, targetId: play.targetId });
        } catch (error) {
            if (error instanceof BattleRuleError) throw AppError.badRequest(error.message);
            throw error;
        }
        return settle(tx, row, row.state, result.state, result.log);
    });
}

export async function fleeRun(playerId: string, runId: string): Promise<GeoRunResponse> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        const [row] = await tx<RunRow>(FIND_RUN_FOR_UPDATE, [runId, playerId]);
        if (!row) throw AppError.notFound("Run not found");
        if (row.status !== "active") throw AppError.badRequest("That Run is over");

        await tx(UPDATE_RUN, [row.id, row.state, "fled", null, null]);
        return { run: toRunView({ ...row, status: "fled" }), log: [] };
    });
}

/**
 * The player dies outside a fight's own rules: every coin carried is lost,
 * as on a defeat, and a Run in progress ends as one.
 */
export async function killPlayer(playerId: string, cause: GeoDeathCause): Promise<GeoDeathResponse> {
    return withTransaction(async (tx) => {
        const [active] = await tx<RunRow>(FIND_ACTIVE_RUN_FOR_UPDATE, [playerId]);
        const coinsLost = await playerRepository.loseAllCoins(tx, playerId, cause, active?.id ?? cause);
        if (active) {
            const state: BattleState = { ...active.state, outcome: "defeat" };
            await tx(UPDATE_RUN, [active.id, state, "defeat", null, String(coinsLost)]);
        }
        return { cause, coinsLost };
    });
}

/** "Giant Spider", or the first enemy's name and how many more. */
function chestSourceName(enemyIds: string[]): string {
    const first = CONTENT.enemies[enemyIds[0] ?? ""]?.name ?? "Unknown";
    return enemyIds.length > 1 ? `${first} +${enemyIds.length - 1}` : first;
}

/**
 * Saves a turn: card charges spent, food eaten, the new battle state, and —
 * on a win — loot and XP. All in the caller's transaction, so a turn is never half-saved.
 */
async function settle(
    tx: TxQuery,
    row: RunRow,
    before: BattleState,
    after: BattleState,
    log: LogEntry[],
): Promise<GeoRunResponse> {
    const playerId = row.player_id;
    const handBefore = before.combatants.find((c) => c.side === "player")?.hand ?? [];
    const handAfter = after.combatants.find((c) => c.side === "player")?.hand ?? [];
    for (const card of handAfter) {
        const previous = handBefore.find((c) => c.instanceId === card.instanceId);
        if (previous && previous.chargesLeft !== card.chargesLeft) {
            await playerRepository.setCharges(tx, playerId, card.instanceId, card.chargesLeft);
        }
    }

    // Food eaten is taken from the stored lunchbox in this same transaction,
    // guarded on what the fight thought was there, so the heal and the food
    // leaving are saved together or not at all.
    const lunchboxBefore = before.combatants.find((c) => c.side === "player")?.lunchbox ?? [];
    const lunchboxAfter = after.combatants.find((c) => c.side === "player")?.lunchbox ?? [];
    for (const entry of lunchboxAfter) {
        const previous = lunchboxBefore.find((e) => e.slot === entry.slot);
        if (previous && previous.quantity !== entry.quantity) {
            await playerRepository.eatFromLunchbox(tx, playerId, {
                slot: entry.slot,
                itemId: entry.foodId,
                from: previous.quantity,
                to: entry.quantity,
            });
        }
    }

    const status: GeoRunStatus = after.outcome === "ongoing" ? "active" : after.outcome;
    let rewards: GeoRewards | null = row.rewards;

    if (status === "victory" && !rewards) {
        const lootRng = createRng((after.seed ^ LOOT_SEED_SALT) >>> 0);
        const winner = after.combatants.find((c) => c.side === "player");
        const magicFind = winner ? statOf(winner, MAGIC_FIND_STAT, CONTENT) : 0;
        // An enemy that gives chests this time gives them instead of its loot list.
        const chests: RolledChest[] = [];
        const items: Drop[] = [];
        for (const enemyId of row.enemy_ids) {
            const won = rollChests(enemyId, lootRng, CONTENT, magicFind);
            if (won) chests.push(...won);
            else items.push(...rollLoot(enemyId, lootRng, CONTENT, magicFind));
        }
        const rolled = row.enemy_ids.reduce((sum, id) => sum + rollCoins(id, lootRng, CONTENT), 0);
        // Global effects (e.g. Malphas's Grave Robber) scale coin drops.
        const coins = Math.round(applyModifiers(rolled, await globalModifiers(tx), "coinDrops"));
        const xp = row.enemy_ids.reduce((sum, id) => sum + (CONTENT.enemies[id]?.xp ?? 0), 0);

        await playerRepository.grantItems(tx, playerId, items);
        await playerRepository.addCoins(tx, playerId, coins, "run-loot", row.id);
        await playerRepository.addSkillXp(tx, playerId, "combat", xp);
        if (row.spawn_id) await worldRepository.claimSpawn(tx, playerId, row.spawn_id);

        let chestReward: GeoRewards["chests"] = null;
        if (chests.length > 0) {
            const source = { kind: "combat" as const, name: chestSourceName(row.enemy_ids) };
            const selection = await chestsRepository.createSelection(tx, playerId, source, row.id, chests);
            chestReward = { selectionId: selection.id, chests: chestsRepository.toSelectionView(selection).chests };
        }
        rewards = { items, coins, xp: [{ skill: "combat", amount: xp }], chests: chestReward };
    }

    // Defeat costs every coin carried. Fleeing costs nothing but the loot.
    let coinsLost = row.coins_lost;
    if (status === "defeat" && coinsLost === null) {
        coinsLost = String(await playerRepository.loseAllCoins(tx, playerId, "run-defeat", row.id));
        // Some enemies leave once they've won; marking the spawn claimed takes
        // it off the map the same way a beaten one goes.
        const leaves = row.enemy_ids.some((id) => CONTENT.enemies[id]?.leavesAfterWinning);
        if (leaves && row.spawn_id) await worldRepository.claimSpawn(tx, playerId, row.spawn_id);
    }

    await tx(UPDATE_RUN, [row.id, after, status, rewards, coinsLost]);
    return { run: toRunView({ ...row, state: after, status, rewards, coins_lost: coinsLost }), log };
}
