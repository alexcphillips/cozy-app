import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceMetres } from "@cozy/shared/geo";
import { createRng } from "../engine/rng";
import { MAX_SPAWNS, randomPointNear, rollEnemyId, rollLifetimeMs, rollSpawnCount, SPAWN_RULES } from "./spawns";

const DALLAS = { latitude: 32.7894, longitude: -96.8016 };

describe("spawns", () => {
    it("land in the ring around the player", () => {
        const rng = createRng(1);
        for (let i = 0; i < 2000; i++) {
            const distance = distanceMetres(DALLAS, randomPointNear(DALLAS, rng));
            assert.ok(distance >= SPAWN_RULES.minSpawnMetres - 0.5, `too close: ${distance}`);
            assert.ok(distance <= SPAWN_RULES.maxSpawnMetres + 0.5, `too far: ${distance}`);
        }
    });

    it("number 1 to 5, mostly one or two, rarely five", () => {
        const rng = createRng(2);
        const tally = new Array(MAX_SPAWNS + 1).fill(0) as number[];
        const rolls = 10_000;
        for (let i = 0; i < rolls; i++) tally[rollSpawnCount(rng)]! += 1;

        assert.equal(MAX_SPAWNS, 5);
        assert.equal(tally[0], 0);
        assert.ok(tally[1]! + tally[2]! > rolls * 0.6, "one or two most of the time");
        assert.ok(tally[5]! < rolls * 0.06, "five is rare");
        assert.ok(tally[5]! > 0, "but possible");
    });

    it("last between the minimum and maximum lifetime", () => {
        const rng = createRng(3);
        for (let i = 0; i < 500; i++) {
            const minutes = rollLifetimeMs(rng) / 60_000;
            assert.ok(minutes >= SPAWN_RULES.lifetimeMinutes.min && minutes <= SPAWN_RULES.lifetimeMinutes.max);
        }
    });

    it("never roll the test dragon, which only the admin spawn makes", () => {
        assert.ok(!SPAWN_RULES.enemies.some((entry): boolean => (entry.enemyId as string) === "test-dragon"));
        const rng = createRng(3);
        for (let i = 0; i < 2000; i++) assert.notEqual(rollEnemyId(rng), "test-dragon");
    });
});
