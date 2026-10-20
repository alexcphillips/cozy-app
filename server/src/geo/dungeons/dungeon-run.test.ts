import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMap, parseLayoutMap, type DungeonMapRules } from "./dungeon-map";
import { isPassable, makePuzzle, moveProblem, newRunState, toDungeonRunView, visibility, type DungeonRunState } from "./dungeon-run";

const rules: DungeonMapRules = {
    id: "test",
    stars: 1,
    minibosses: 0,
    roomStyle: null,
    rooms: { gate: { kind: "encounter", name: "Gate", style: null, lock: "test-key" } },
    pool: [],
};
const scoring = { chestScores: { gold: 40, ruby: 70, void: 90 }, penalties: { failedPuzzle: 20, death: 15 } };

//   B-a-p
//     |
//   s-E-k-w      k is locked; w is its wing.
const { map } = buildMap(
    rules,
    {
        id: "t",
        dungeon: "test",
        map: parseLayoutMap(`
            B-a-p
              |
            s-E-k-w
        `),
        legend: { B: "boss", a: "encounter", p: "puzzle", s: "star", E: "entrance", k: "gate", w: "loot" },
        place: [],
        roomStyle: null,
        mirror: false,
    },
    { pick: () => 0 },
);
const id = (key: string) => map.rooms.find((room) => room.key === key)!.id;
const fresh = (): DungeonRunState => newRunState(map, 100, 1, 0);
const view = (state: DungeonRunState) =>
    toDungeonRunView({ id: "r", dungeonId: "test", dungeonName: "Test", status: "active" }, map, state, scoring, () => undefined);

describe("dungeon runs", () => {
    it("starts at the entrance seeing its neighbours and the boss, nothing else", () => {
        const shown = view(fresh()).rooms.map((room) => [map.rooms[room.id]!.key, room.seen]);
        assert.deepEqual(new Map(shown as [string, string][]), new Map([["B", "seen"], ["a", "seen"], ["s", "seen"], ["E", "visited"], ["k", "seen"]]));
        // The wing behind the lock is never sent before it's opened.
        assert.equal(visibility(map, fresh(), map.rooms[id("w")]!), null);
    });

    it("refuses moves the rules don't allow", () => {
        const state = fresh();
        assert.equal(moveProblem(map, state, id("p")), "You can't see a way there");
        assert.match(moveProblem(map, state, id("B"))!, /blocks the way/);
        const pastTheFight = { ...state, visited: [id("E"), id("a")], done: [id("a")] };
        assert.match(moveProblem(map, pastTheFight, id("B"))!, /sealed: 0 of 1/);
        assert.equal(moveProblem(map, { ...pastTheFight, done: [id("a"), id("s")] }, id("B")), null);
        assert.equal(moveProblem(map, state, id("E")), "You're already there");
        assert.equal(moveProblem(map, state, id("s")), null);
        assert.equal(moveProblem(map, { ...state, fight: { runId: "x", room: id("s") } }, id("k")), "Finish the fight first");
    });

    it("an unfinished fight or puzzle blocks the rooms past it; loot doesn't", () => {
        // In the fight room without having cleared it: the puzzle beyond is out of reach.
        const state: DungeonRunState = { ...fresh(), current: id("a"), visited: [id("E"), id("a")] };
        assert.match(moveProblem(map, state, id("p"))!, /blocks the way/);
        assert.equal(moveProblem(map, { ...state, done: [id("a")] }, id("p")), null);
        assert.ok(isPassable(map.rooms[id("w")]!, state));
    });

    it("never sends a puzzle's answer", () => {
        const puzzle = makePuzzle(() => 0.3);
        assert.equal(puzzle.options.length, 4);
        assert.equal(new Set(puzzle.options).size, 4);
        const state: DungeonRunState = { ...fresh(), current: id("p"), visited: [id("E"), id("p")], puzzles: { [id("p")]: puzzle } };
        const shown = view(state);
        assert.deepEqual(shown.puzzle, { roomId: id("p"), prompt: puzzle.prompt, options: puzzle.options });
        assert.ok(!JSON.stringify(shown).includes('"answer"'));
    });

    it("marks the door into a locked room until it's opened", () => {
        const locked = view(fresh()).doors.find((door) => door.rooms.includes(id("k")))!;
        assert.equal(locked.locked, true);
        const opened = view({ ...fresh(), unlocked: [id("k")] }).doors.find((door) => door.rooms.includes(id("k")))!;
        assert.equal(opened.locked, false);
    });
});
