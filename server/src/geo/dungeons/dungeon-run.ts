import type { GeoDungeonDoor, GeoDungeonPuzzle, GeoDungeonRoom, GeoDungeonRunStatus, GeoDungeonRunView, GeoRoomStyle } from "@cozy/shared/geo";
import { dungeonScore, PASSABLE_KINDS, type DungeonMap, type DungeonScoreRules, type MapRoom } from "./dungeon-map";

/**
 * One player's walk through a rolled dungeon map: what they've seen and
 * done, their health, the puzzle answers they can't see. Pure: the
 * repository (`modules/dungeon-runs`) loads and saves it.
 *
 * Solo for now: each lobby member gets their own map. The state is shaped
 * so shared party maps can split it into party-wide and per-player parts.
 */

export type DungeonPuzzleState = {
    prompt: string;
    options: string[];
    /** Index into `options`. Never sent to the app. */
    answer: number;
    result: "solved" | "failed" | null;
};

export type DungeonRunState = {
    current: number;
    /** Where a fled fight sends you back to. */
    previous: number;
    visited: number[];
    /** Cleared, solved, collected or triggered. */
    done: number[];
    /** Locked rooms opened with a key. */
    unlocked: number[];
    /** By room id. */
    puzzles: Record<string, DungeonPuzzleState>;
    health: number;
    maxHealth: number;
    deaths: number;
    /** The combat Run going on in a room. */
    fight: { runId: string; room: number } | null;
    /** The run's own RNG (enemy picks, loot, puzzles), resumed from `draws`. */
    seed: number;
    draws: number;
    chestSelectionId: string | null;
};

export function newRunState(map: DungeonMap, maxHealth: number, seed: number, draws: number): DungeonRunState {
    return {
        current: map.entrance,
        previous: map.entrance,
        visited: [map.entrance],
        done: [],
        unlocked: [],
        puzzles: {},
        health: maxHealth,
        maxHealth,
        deaths: 0,
        fight: null,
        seed,
        draws,
        chestSelectionId: null,
    };
}

/** Inside a key wing the player hasn't opened (the locked room itself still shows). */
export const isHidden = (room: MapRoom, state: DungeonRunState) => room.wingOf.some((lock) => lock !== room.id && !state.unlocked.includes(lock));
export const isDone = (room: MapRoom, state: DungeonRunState) => state.done.includes(room.id);
export const isLocked = (room: MapRoom, state: DungeonRunState) => room.lock !== null && !state.unlocked.includes(room.id);
/** You can walk through it: it never blocks, or it's done. */
export const isPassable = (room: MapRoom, state: DungeonRunState) => PASSABLE_KINDS.includes(room.kind) || isDone(room, state);

/** Visited, seen (next to a visited room, or the boss room), or under fog (null: never sent). */
export function visibility(map: DungeonMap, state: DungeonRunState, room: MapRoom): GeoDungeonRoom["seen"] | null {
    if (isHidden(room, state)) return null;
    if (state.visited.includes(room.id)) return "visited";
    if (room.kind === "boss") return "seen";
    return map.adjacent[room.id]!.some((id) => state.visited.includes(id) && !isHidden(map.rooms[id]!, state)) ? "seen" : null;
}

export function stars(map: DungeonMap, state: DungeonRunState) {
    const all = map.rooms.filter((room) => room.kind === "star");
    return { cleared: all.filter((room) => isDone(room, state)).length, total: all.length };
}

/** Why the player can't walk into `roomId` now, or null if they can (a lock still needs its key). */
export function moveProblem(map: DungeonMap, state: DungeonRunState, roomId: number): string | null {
    if (state.fight) return "Finish the fight first";
    const room = map.rooms[roomId];
    if (!room || visibility(map, state, room) === null) return "You can't see a way there";
    if (room.id === state.current) return "You're already there";
    const reachable = map.adjacent[room.id]!.some((id) => {
        const from = map.rooms[id]!;
        return state.visited.includes(id) && !isHidden(from, state) && isPassable(from, state);
    });
    if (!reachable) return "Something blocks the way. Clear the room before it first.";
    if (room.kind === "boss") {
        const { cleared, total } = stars(map, state);
        if (cleared < total) return `The boss's door is sealed: ${cleared} of ${total} star rooms cleared`;
    }
    return null;
}

/**
 * PLACEHOLDER: the one puzzle type until puzzles are designed. A number
 * sequence with four choices, made from the run's RNG.
 */
export function makePuzzle(next: () => number): DungeonPuzzleState {
    const roll = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
    const start = roll(2, 9);
    const step = roll(2, 7);
    const terms = [0, 1, 2, 3].map((index) => start + step * index);
    const correct = start + step * 4;
    const wrong = new Set<number>();
    for (const offset of [step, -step, 1, -1, 2, step * 2]) {
        if (wrong.size === 3) break;
        const value = correct + offset;
        if (value > 0 && value !== correct) wrong.add(value);
    }
    const options = [correct, ...wrong];
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [options[i], options[j]] = [options[j]!, options[i]!];
    }
    return { prompt: `What comes next? ${terms.join(", ")}, …`, options: options.map(String), answer: options.indexOf(correct), result: null };
}

export function scoreOf(map: DungeonMap, state: DungeonRunState, rules: DungeonScoreRules) {
    return dungeonScore(
        map,
        { done: (room) => isDone(room, state), puzzleResult: (room) => state.puzzles[room.id]?.result ?? null, deaths: state.deaths },
        rules,
    );
}

/** The map as the player may see it: no fogged rooms, no puzzle answers. */
export function toDungeonRunView(
    run: { id: string; dungeonId: string; dungeonName: string; status: GeoDungeonRunStatus },
    map: DungeonMap,
    state: DungeonRunState,
    rules: DungeonScoreRules,
    styleOf: (id: string) => GeoRoomStyle | undefined,
): GeoDungeonRunView {
    const rooms: GeoDungeonRoom[] = map.rooms.flatMap((room) => {
        const seen = visibility(map, state, room);
        if (!seen) return [];
        return [{ id: room.id, cells: room.cells, kind: room.kind, name: room.name, style: room.style, seen, done: isDone(room, state), locked: isLocked(room, state) }];
    });
    const shown = new Set(rooms.map((room) => room.id));
    const doors: GeoDungeonDoor[] = map.doors.flatMap((door) => {
        const [a, b] = door.rooms;
        if (!shown.has(a) || !shown.has(b)) return [];
        const into = (lock: MapRoom, other: MapRoom) => isLocked(lock, state) && !other.wingOf.includes(lock.id);
        const roomA = map.rooms[a]!;
        const roomB = map.rooms[b]!;
        return [{ a: door.a, b: door.b, rooms: door.rooms, locked: into(roomA, roomB) || into(roomB, roomA) }];
    });
    const styles: Record<string, GeoRoomStyle> = {};
    for (const room of rooms) {
        const style = room.style ? styleOf(room.style) : undefined;
        if (room.style && style) styles[room.style] = style;
    }
    const pending = state.puzzles[state.current];
    const puzzle: GeoDungeonPuzzle | null =
        pending && pending.result === null ? { roomId: state.current, prompt: pending.prompt, options: pending.options } : null;
    const { score, chests } = scoreOf(map, state, rules);
    return {
        id: run.id,
        dungeonId: run.dungeonId,
        dungeonName: run.dungeonName,
        status: run.status,
        cols: map.cols,
        rows: map.rows,
        rooms,
        doors,
        styles,
        currentRoom: state.current,
        health: state.health,
        maxHealth: state.maxHealth,
        stars: stars(map, state),
        fightRunId: state.fight?.runId ?? null,
        puzzle,
        score,
        chestTiers: chests,
        chestSelectionId: state.chestSelectionId,
    };
}
