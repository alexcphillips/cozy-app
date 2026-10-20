import type { GeoDungeonRunView, GeoRoomStyle } from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { rollPools, type RolledChest } from "../../combat/combatants";
import { CONTENT, type DungeonDef } from "../../content";
import type { TxQuery } from "../../db/transaction";
import type { DungeonScoreRules } from "../../dungeons/dungeon-map";
import { scoreOf, toDungeonRunView, type DungeonRunState } from "../../dungeons/dungeon-run";
import { createRng } from "../../engine/rng";
import * as chestsRepository from "../chests/geo-chests.repository";
import * as questsRepository from "../quests/geo-quests.repository";
import { FIND_ACTIVE_DUNGEON_RUN, FIND_ACTIVE_DUNGEON_RUN_FOR_UPDATE, FIND_DUNGEON_RUN_FOR_UPDATE, UPDATE_DUNGEON_RUN } from "./geo-dungeon-runs.sql";
import type { DungeonRunRow } from "./geo-dungeon-runs.types";

/**
 * What the rest of geo-game needs from dungeon runs without importing the
 * Run code (which imports this): the in-a-dungeon check, the hook a room
 * fight calls when it ends, and the view.
 */

/** Defaults for a dungeon gone from the content since the run started. */
const FALLBACK_RULES: DungeonScoreRules = { chestScores: { gold: 40, ruby: 70, void: 90 }, penalties: { failedPuzzle: 20, death: 15 } };

export const rulesOf = (dungeon: DungeonDef | undefined): DungeonScoreRules =>
    dungeon ? { chestScores: dungeon.chestScores, penalties: dungeon.penalties } : FALLBACK_RULES;

function styleOf(id: string): GeoRoomStyle | undefined {
    const style = CONTENT.roomStyles[id];
    if (!style) return undefined;
    const { corner, radius, rough, wall, inset, tone } = style;
    return { corner, radius, rough, wall, inset, tone };
}

export function toView(row: DungeonRunRow): GeoDungeonRunView {
    const dungeon = CONTENT.dungeons[row.dungeon_id];
    return toDungeonRunView(
        { id: row.id, dungeonId: row.dungeon_id, dungeonName: dungeon?.name ?? row.dungeon_id, status: row.status },
        row.map,
        row.state,
        rulesOf(dungeon),
        styleOf,
    );
}

export async function saveRun(tx: TxQuery, row: DungeonRunRow) {
    await tx(UPDATE_DUNGEON_RUN, [row.id, row.status, row.state]);
}

/** The player's dungeon run in progress, locked. */
export async function findActiveForUpdate(tx: TxQuery, playerId: string): Promise<DungeonRunRow | undefined> {
    const [row] = await tx<DungeonRunRow>(FIND_ACTIVE_DUNGEON_RUN_FOR_UPDATE, [playerId]);
    return row;
}

/** Refuses while the player is in a dungeon, e.g. a spawn fight or fishing. The caller holds the player lock. */
export async function assertNotInDungeon(tx: TxQuery, playerId: string, message = "You're in a dungeon. Finish or leave it first.") {
    const [row] = await tx<DungeonRunRow>(FIND_ACTIVE_DUNGEON_RUN, [playerId]);
    if (row) throw AppError.badRequest(message);
}

/**
 * A room fight has ended (from its own turn, a flee, or a leave). Win: the
 * room is done, and the boss ends the dungeon with its chests. Defeat: the
 * dungeon is failed. Fled: back to the room you came from, damage kept.
 * `health` is what the fight left. In the fight's transaction.
 */
export async function dungeonFightOver(
    tx: TxQuery,
    fight: { id: string; player_id: string; dungeon_run_id: string | null; dungeon_room: number | null },
    outcome: "victory" | "defeat" | "fled",
    health: number,
): Promise<void> {
    if (!fight.dungeon_run_id || fight.dungeon_room === null) return;
    const [row] = await tx<DungeonRunRow>(FIND_DUNGEON_RUN_FOR_UPDATE, [fight.dungeon_run_id, fight.player_id]);
    // A fight that ends as it starts arrives before the run has noted it.
    if (!row || row.status !== "active" || (row.state.fight && row.state.fight.runId !== fight.id)) return;
    const state: DungeonRunState = { ...row.state, fight: null, health: Math.max(0, health) };
    const room = row.map.rooms[fight.dungeon_room]!;

    if (outcome === "victory") {
        state.done = [...state.done, room.id];
        if (room.kind === "boss") return finishWon(tx, { ...row, state }, fight.id);
    } else if (outcome === "defeat") {
        state.deaths += 1;
        state.health = 0;
        return saveRun(tx, { ...row, status: "failed", state });
    } else {
        state.current = state.previous;
    }
    await saveRun(tx, { ...row, state });
}

/** The boss fell: score the run, put its chests in the Chests tab, and count it for quests. */
async function finishWon(tx: TxQuery, row: DungeonRunRow, bossRunId: string) {
    const dungeon = CONTENT.dungeons[row.dungeon_id];
    const state = { ...row.state };
    const { chests: tiers } = scoreOf(row.map, state, rulesOf(dungeon));
    const rng = createRng(state.seed, state.draws);
    const chests: RolledChest[] = tiers.flatMap((tier) => {
        const pools = dungeon?.chests[tier];
        if (!pools) return [];
        const { name, cost } = CONTENT.chestTiers[tier];
        return [{ tier, name, cost, items: rollPools(pools, rng) }];
    });
    state.draws = rng.draws();
    if (chests.length > 0) {
        const source = { kind: "dungeon" as const, name: dungeon?.name ?? row.dungeon_id };
        const selection = await chestsRepository.createSelection(tx, row.player_id, source, bossRunId, chests);
        state.chestSelectionId = selection.id;
    }
    await questsRepository.recordQuestEvents(tx, row.player_id, [{ type: "dungeon", dungeonId: row.dungeon_id }]);
    await saveRun(tx, { ...row, status: "won", state });
}
