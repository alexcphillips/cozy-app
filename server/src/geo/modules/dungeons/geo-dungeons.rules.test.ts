import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GEO_DUNGEON_ENTER_SECONDS } from "@cozy/shared/geo";
import { lobbyPhase, requiredLevelProblem } from "./geo-dungeons.rules";

const NOW = new Date("2026-10-15T12:00:00Z");
const at = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);
const lobby = (times: Partial<{ starts_at: Date; started_at: Date | null; closed_at: Date | null }>) => ({
    starts_at: at(60),
    started_at: null,
    closed_at: null,
    now: NOW,
    ...times,
});

describe("lobbyPhase", () => {
    it("is open while counting down", () => {
        assert.deepEqual(lobbyPhase(lobby({ starts_at: at(90.2) })), { phase: "open", secondsLeft: 91 });
    });

    it("starts when the countdown runs out", () => {
        assert.deepEqual(lobbyPhase(lobby({ starts_at: at(-10) })), {
            phase: "started",
            secondsLeft: GEO_DUNGEON_ENTER_SECONDS - 10,
        });
    });

    it("starts early when the host starts it", () => {
        assert.deepEqual(lobbyPhase(lobby({ starts_at: at(100), started_at: at(-5) })), {
            phase: "started",
            secondsLeft: GEO_DUNGEON_ENTER_SECONDS - 5,
        });
    });

    it("expires once the time to enter is up", () => {
        assert.equal(lobbyPhase(lobby({ starts_at: at(-GEO_DUNGEON_ENTER_SECONDS) })).phase, "expired");
    });

    it("is closed once the host has left", () => {
        assert.equal(lobbyPhase(lobby({ closed_at: at(-1) })).phase, "closed");
    });
});

describe("requiredLevelProblem", () => {
    it("allows the dungeon's minimum up to the host's level", () => {
        assert.equal(requiredLevelProblem(5, 5, 9), null);
        assert.equal(requiredLevelProblem(9, 5, 9), null);
    });

    it("refuses below the dungeon's minimum", () => {
        assert.match(requiredLevelProblem(4, 5, 9) ?? "", /at least combat level 5/);
    });

    it("refuses above the host's own level", () => {
        assert.match(requiredLevelProblem(10, 5, 9) ?? "", /higher combat level than your own/);
    });

    it("refuses a host below the dungeon's minimum", () => {
        assert.match(requiredLevelProblem(5, 5, 3) ?? "", /needs combat level 5/);
    });

    it("refuses a non-integer", () => {
        assert.match(requiredLevelProblem(2.5, 1, 9) ?? "", /whole number/);
    });
});
