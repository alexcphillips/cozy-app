import type { GeoDungeonRunResponse, GeoDungeonRunView, GeoRunResponse } from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { rollPools, type Drop } from "../../combat/combatants";
import { CONTENT, type DungeonDef } from "../../content";
import { withTransaction, type TxQuery } from "../../db/transaction";
import { rollMap } from "../../dungeons/dungeon-map";
import { isDone, isLocked, makePuzzle, moveProblem, newRunState, type DungeonRunState } from "../../dungeons/dungeon-run";
import { createRng, randomSeed } from "../../engine/rng";
import { playerMaxHealth } from "../../world/global-effects";
import * as fishingRepository from "../fishing/geo-fishing.repository";
import * as playerRepository from "../player/geo-player.repository";
import * as runsRepository from "../runs/geo-runs.repository";
import { ABANDON_STALE_RUNS, FIND_ACTIVE_RUN } from "../runs/geo-runs.sql";
import type { RunRow } from "../runs/geo-runs.types";
import { dungeonFightOver, findActiveForUpdate, saveRun, toView } from "./geo-dungeon-runs.fights";
import { END_FIGHT, FIND_DUNGEON_RUN_FOR_UPDATE, FIND_FIGHT, INSERT_DUNGEON_RUN } from "./geo-dungeon-runs.sql";
import type { DungeonRunRow } from "./geo-dungeon-runs.types";

/** PLACEHOLDER: an event room is a healing spring for a quarter of max health, until events are designed. */
const SPRING_HEAL_SHARE = 0.25;

/**
 * Opens a dungeon run for one lobby member in the start's transaction: the
 * map rolled on the server, at full health. Refuses a player who can't go
 * in (in a fight, already in a dungeon, an empty combat hand); a fishing
 * spot is left, as for any fight. The caller holds the player lock.
 */
export async function openDungeonRun(tx: TxQuery, playerId: string, dungeon: DungeonDef, lobbyId: string): Promise<GeoDungeonRunView> {
    await tx(ABANDON_STALE_RUNS, [playerId, runsRepository.ABANDON_AFTER_MINUTES]);
    const [active] = await tx<RunRow>(FIND_ACTIVE_RUN, [playerId]);
    if (active && (active.kind as string) === "fishing") await fishingRepository.endOpenFishing(tx, active);
    else if (active) throw AppError.badRequest("You're already in a Run. Finish or flee it first.");
    if (await findActiveForUpdate(tx, playerId)) throw AppError.badRequest("You're already in a dungeon");
    if ((await playerRepository.findHand(playerId, "combat", tx)).length === 0) throw AppError.badRequest("Your combat hand is empty");

    const seed = randomSeed();
    const rng = createRng(seed);
    const layout = dungeon.layouts[Math.floor(rng.next() * dungeon.layouts.length)]!;
    const map = rollMap(dungeon, layout, rng.next);
    const state = newRunState(map, await playerMaxHealth(playerId, tx), seed, rng.draws());
    const [row] = await tx<DungeonRunRow>(INSERT_DUNGEON_RUN, [playerId, dungeon.id, lobbyId, map, state]);
    if (!row) throw new Error("Dungeon run insert returned nothing");
    return toView(row);
}

/** Locks the player and their dungeon run, and catches up on a fight that ended out of sight. */
async function lockRun(tx: TxQuery, playerId: string, dungeonRunId: string): Promise<DungeonRunRow> {
    await playerRepository.lockPlayer(tx, playerId);
    await tx(ABANDON_STALE_RUNS, [playerId, runsRepository.ABANDON_AFTER_MINUTES]);
    const [row] = await tx<DungeonRunRow>(FIND_DUNGEON_RUN_FOR_UPDATE, [dungeonRunId, playerId]);
    if (!row) throw AppError.notFound("Dungeon run not found");
    return reconcile(tx, row);
}

/**
 * A room fight left too long is ended as fled by the Run code, which can't
 * tell the map: do it here, so the map isn't stuck waiting on it.
 */
async function reconcile(tx: TxQuery, row: DungeonRunRow): Promise<DungeonRunRow> {
    const fight = row.state.fight;
    if (row.status !== "active" || !fight) return row;
    const [run] = await tx<Pick<RunRow, "status" | "state">>(FIND_FIGHT, [fight.runId]);
    if (run?.status === "active") return row;
    const health = run?.state.combatants.find((c) => c.side === "player")?.health ?? row.state.health;
    await dungeonFightOver(tx, { id: fight.runId, player_id: row.player_id, dungeon_run_id: row.id, dungeon_room: fight.room }, "fled", health);
    const [fresh] = await tx<DungeonRunRow>(FIND_DUNGEON_RUN_FOR_UPDATE, [row.id, row.player_id]);
    return fresh!;
}

function response(row: DungeonRunRow, extra: Partial<Omit<GeoDungeonRunResponse, "dungeonRun">> = {}): GeoDungeonRunResponse {
    return { dungeonRun: toView(row), fight: null, found: [], notes: [], ...extra };
}

/** The dungeon run in progress, or null; for picking it back up after a restart. */
export async function findActive(playerId: string): Promise<GeoDungeonRunResponse | null> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await tx(ABANDON_STALE_RUNS, [playerId, runsRepository.ABANDON_AFTER_MINUTES]);
        const row = await findActiveForUpdate(tx, playerId);
        return row ? response(await reconcile(tx, row)) : null;
    });
}

/** One of the player's dungeon runs, over or not: how it ended, after the last fight. */
export async function findOne(playerId: string, dungeonRunId: string): Promise<GeoDungeonRunResponse> {
    return withTransaction(async (tx) => response(await lockRun(tx, playerId, dungeonRunId)));
}

function pickEnemy(dungeon: DungeonDef, kind: string, next: () => number): string {
    const pool = kind === "star" ? dungeon.starEnemies : kind === "miniboss" ? dungeon.minibossEnemies : dungeon.encounterEnemies;
    return pool[Math.floor(next() * pool.length)]!;
}

/**
 * Walks into a room. Every rule is checked here: a door from where you've
 * been, nothing blocking the way, the boss sealed until every star room is
 * cleared, and the key for a locked room (one is used up). What's inside
 * happens at once: a fight starts, loot goes into the inventory, a puzzle
 * appears.
 */
export async function move(playerId: string, dungeonRunId: string, roomId: number): Promise<GeoDungeonRunResponse> {
    return withTransaction(async (tx) => {
        const row = await lockRun(tx, playerId, dungeonRunId);
        if (row.status !== "active") throw AppError.badRequest("That dungeon is over");
        const dungeon = CONTENT.dungeons[row.dungeon_id];
        if (!dungeon) throw AppError.badRequest("That dungeon no longer exists");
        const problem = moveProblem(row.map, row.state, roomId);
        if (problem) throw AppError.badRequest(problem);

        const room = row.map.rooms[roomId]!;
        const state: DungeonRunState = { ...row.state };
        const notes: string[] = [];
        const found: Drop[] = [];
        if (isLocked(room, state)) {
            await playerRepository.takeItems(tx, playerId, room.lock!, 1);
            state.unlocked = [...state.unlocked, room.id];
            notes.push(`You used a ${CONTENT.items[room.lock!]?.name ?? "key"}. Only you can go past this door.`);
        }
        state.previous = state.current;
        state.current = room.id;
        if (!state.visited.includes(room.id)) state.visited = [...state.visited, room.id];

        const rng = createRng(state.seed, state.draws);
        let fightTarget: runsRepository.RunTarget | null = null;
        if (!isDone(room, state)) {
            switch (room.kind) {
                case "encounter":
                case "star":
                case "miniboss":
                    fightTarget = { enemyId: pickEnemy(dungeon, room.kind, rng.next), spawnId: null, keepsHealth: true };
                    break;
                case "boss":
                    fightTarget = { enemyId: dungeon.boss, spawnId: null, enemyModifiers: dungeon.bossModifiers, keepsHealth: true };
                    break;
                case "loot": {
                    const items = rollPools(dungeon.roomLoot, rng);
                    await playerRepository.grantItems(tx, playerId, items);
                    found.push(...items);
                    state.done = [...state.done, room.id];
                    break;
                }
                case "event": {
                    const healed = Math.min(state.maxHealth - state.health, Math.round(state.maxHealth * SPRING_HEAL_SHARE));
                    state.health += healed;
                    notes.push(healed > 0 ? `A healing spring: +${healed} health.` : "A healing spring. You're already at full health.");
                    state.done = [...state.done, room.id];
                    break;
                }
                case "puzzle":
                    if (!state.puzzles[room.id]) state.puzzles = { ...state.puzzles, [room.id]: makePuzzle(rng.next) };
                    notes.push("A puzzle. One answer, one try.");
                    break;
                default:
                    break;
            }
        }
        state.draws = rng.draws();
        await saveRun(tx, { ...row, state });

        let fight: GeoRunResponse | null = null;
        if (fightTarget) {
            fight = await runsRepository.openCombatRun(tx, playerId, {
                ...fightTarget,
                dungeonRunId: row.id,
                dungeonRoom: room.id,
                startHealth: state.health,
            });
            if (fight.run.status === "active") await saveRun(tx, { ...row, state: { ...state, fight: { runId: fight.run.id, room: room.id } } });
            else await dungeonFightOver(tx, { id: fight.run.id, player_id: playerId, dungeon_run_id: row.id, dungeon_room: room.id }, fight.run.status === "victory" ? "victory" : "defeat", state.health);
        }
        const [fresh] = await tx<DungeonRunRow>(FIND_DUNGEON_RUN_FOR_UPDATE, [row.id, playerId]);
        return response(fresh!, { fight, found, notes });
    });
}

/** Answers the puzzle in the player's room: one try, right or wrong. */
export async function answerPuzzle(playerId: string, dungeonRunId: string, answer: number): Promise<GeoDungeonRunResponse> {
    return withTransaction(async (tx) => {
        const row = await lockRun(tx, playerId, dungeonRunId);
        if (row.status !== "active") throw AppError.badRequest("That dungeon is over");
        const puzzle = row.state.puzzles[row.state.current];
        if (!puzzle) throw AppError.badRequest("There's no puzzle here");
        if (puzzle.result) throw AppError.badRequest("That puzzle has had its one try");
        if (!Number.isInteger(answer) || answer < 0 || answer >= puzzle.options.length) throw AppError.badRequest("Pick one of the options");

        const result = answer === puzzle.answer ? "solved" : "failed";
        const state: DungeonRunState = {
            ...row.state,
            puzzles: { ...row.state.puzzles, [row.state.current]: { ...puzzle, result } },
            done: [...row.state.done, row.state.current],
        };
        const saved = { ...row, state };
        await saveRun(tx, saved);
        const note = result === "solved" ? "Solved." : `Wrong: it was ${puzzle.options[puzzle.answer]}. The Void chest is gone.`;
        return response(saved, { notes: [note] });
    });
}

/** Leaves the dungeon: it counts as failing it. A fight going on ends there. */
export async function leave(playerId: string, dungeonRunId: string): Promise<GeoDungeonRunResponse> {
    return withTransaction(async (tx) => {
        const row = await lockRun(tx, playerId, dungeonRunId);
        if (row.status !== "active") throw AppError.badRequest("That dungeon is over");
        if (row.state.fight) await tx(END_FIGHT, [row.state.fight.runId]);
        const left = { ...row, status: "failed" as const, state: { ...row.state, fight: null } };
        await saveRun(tx, left);
        return response(left, { notes: ["You left the dungeon. No chests this time; your purse is safe."] });
    });
}
