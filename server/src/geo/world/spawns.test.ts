import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceMetres } from "@cozy/shared/geo";
import { createRng } from "../engine/rng";
import { CONTENT } from "../content";
import { APP_SPRITES } from "./app-sprites.generated";
import { HABITAT_ENEMIES, MAX_SPAWNS, randomPointNear, rollEnemyId, rollLifetimeMs, rollSpawn, rollSpawnCount, SPAWN_RULES } from "./spawns";

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

    /** A point `metres` north of the player. */
    const north = (metres: number) => ({ latitude: DALLAS.latitude + metres / 111_320, longitude: DALLAS.longitude });
    const idsOf = (habitat: keyof typeof HABITAT_ENEMIES) => new Set(HABITAT_ENEMIES[habitat].map((entry) => entry.enemyId));

    describe("near water", () => {
        const shore = north(30);
        const waterIds = idsOf("water");

        it("mix water creatures in by the habitat's pull, placed on the shore and in reach", () => {
            const rng = createRng(4);
            const rolls = 5000;
            let wet = 0;
            for (let i = 0; i < rolls; i++) {
                const { enemyId, point } = rollSpawn(rng, DALLAS, { water: { ...shore, waterKind: "lake" } });
                assert.ok(distanceMetres(DALLAS, point) <= SPAWN_RULES.maxSpawnMetres + 0.5);
                if (!waterIds.has(enemyId)) continue;
                wet += 1;
                assert.ok(distanceMetres(shore, point) <= 8.5, "on the shore");
            }
            const { weight, influenceMetres } = SPAWN_RULES.habitats.water;
            const pull = weight * (1 - 30 / influenceMetres);
            assert.ok(Math.abs(wet / rolls - pull / (1 + pull)) < 0.03, `water share ${wet / rolls}`);
        });

        it("only roll creatures that live in that kind of water", () => {
            const rng = createRng(5);
            for (let i = 0; i < 2000; i++) {
                const { enemyId } = rollSpawn(rng, DALLAS, { water: { ...shore, waterKind: "pond" } });
                const entry = HABITAT_ENEMIES.water.find((candidate) => candidate.enemyId === enemyId);
                if (entry?.waters) assert.ok(entry.waters.includes("pond"), `${enemyId} in a pond`);
            }
        });

        it("ignore water past its influence, or none at all", () => {
            const rng = createRng(6);
            const far = { ...north(SPAWN_RULES.habitats.water.influenceMetres + 5), waterKind: "ocean" as const };
            for (let i = 0; i < 1000; i++) {
                assert.ok(!waterIds.has(rollSpawn(rng, DALLAS, { water: far }).enemyId));
                assert.ok(!waterIds.has(rollSpawn(rng, DALLAS, {}).enemyId));
            }
        });
    });

    describe("near other places", () => {
        it("pull harder the closer the place is", () => {
            const share = (metres: number) => {
                const rng = createRng(7);
                const miners = idsOf("mining");
                let hits = 0;
                for (let i = 0; i < 3000; i++) if (miners.has(rollSpawn(rng, DALLAS, { mining: north(metres) }).enemyId)) hits += 1;
                return hits / 3000;
            };
            const close = share(10);
            const mid = share(SPAWN_RULES.habitats.mining.influenceMetres / 2);
            assert.ok(close > mid && mid > 0, `close ${close}, mid ${mid}`);
            assert.equal(share(SPAWN_RULES.habitats.mining.influenceMetres + 1), 0);
        });

        it("land in reach on the side facing a place out of reach", () => {
            const rng = createRng(8);
            const mine = north(120);
            const miners = idsOf("mining");
            for (let i = 0; i < 2000; i++) {
                const { enemyId, point } = rollSpawn(rng, DALLAS, { mining: mine });
                assert.ok(distanceMetres(DALLAS, point) <= SPAWN_RULES.maxSpawnMetres + 0.5);
                if (miners.has(enemyId)) assert.ok(point.latitude > DALLAS.latitude, "north, toward the mine");
            }
        });

        it("mix several places at once", () => {
            const rng = createRng(9);
            const seen = new Set<string>();
            for (let i = 0; i < 3000; i++) seen.add(rollSpawn(rng, DALLAS, { mining: north(5), landmark: north(-5) }).enemyId);
            assert.ok([...idsOf("mining")].some((id) => seen.has(id)), "a miner");
            assert.ok([...idsOf("landmark")].some((id) => seen.has(id)), "a landmark foe");
            assert.ok(SPAWN_RULES.enemies.some(({ enemyId }) => seen.has(enemyId)), "and the usual");
        });

        it("only spawn enemies the app has art for", () => {
            const spawnable = [...SPAWN_RULES.enemies, ...Object.values(HABITAT_ENEMIES).flat()];
            for (const { enemyId } of spawnable) assert.ok(APP_SPRITES.some((sprite) => sprite === CONTENT.enemies[enemyId]?.sprite), enemyId);
        });

        it("give every habitat someone to spawn", () => {
            for (const [habitat, table] of Object.entries(HABITAT_ENEMIES)) assert.ok(table.length > 0, habitat);
        });
    });
});
