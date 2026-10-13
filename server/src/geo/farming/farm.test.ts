import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GEO_FARM_SIZE } from "@cozy/shared/geo";
import { CONTENT, FARMING } from "../content";
import { createRng } from "../engine/rng";
import {
    accrue,
    FarmRuleError,
    forecast,
    isUnlockable,
    newFarm,
    nextTurnAt,
    planIntent,
    stepFarm,
    upgradeFarm,
    type FarmContext,
    type FarmPest,
    type FarmState,
} from "./farm";

const NOW = new Date("2026-10-13T12:00:00Z");
const HOUR = 3_600_000;
// No pests arrive on their own here; the pest tests place them.
// No storms or frosts on their own either: they'd kill crops other tests are watching.
const config = {
    ...FARMING,
    rotChances: [0, 0, 0, 1],
    pests: { ...FARMING.pests, max: 0 },
    weatherWeights: { ...FARMING.weatherWeights, storm: 0, frost: 0 },
};
const hand = [
    "farm.bucket-line",
    "farm.careful-pick",
    "farm.scythe-sweep",
    "farm.hold",
    "farm.read-sky",
    "farm.ripen",
    "farm.smoke",
    "farm.bait-ring",
    "farm.snap-trap",
    "farm.hand-pollinate",
].map(
    (cardId, i) => ({ inventoryId: `inv-${i}`, itemId: `card.${cardId}`, cardId, chargesLeft: 10 }),
);
const ctx: FarmContext = {
    crops: CONTENT.crops,
    mutations: CONTENT.mutations,
    pests: CONTENT.pests,
    structures: CONTENT.structures,
    config,
    now: NOW,
    hand,
    seedBag: [
        { slot: 0, itemId: "wheat-seeds", quantity: 5 },
        { slot: 1, itemId: "melon-seeds", quantity: 5 },
    ],
    held: Object.fromEntries(Object.values(CONTENT.structures).map((structure) => [structure.itemId, 2])),
};
const card = (cardId: string) => hand.find((entry) => entry.cardId === cardId)!.inventoryId;

/** The middle tile: owned on every new farm. */
const MID = Math.floor((GEO_FARM_SIZE * GEO_FARM_SIZE) / 2);

const farm = (overrides: Partial<FarmState> = {}): FarmState => ({ ...newFarm(config, 1, 2, NOW), turnsBanked: 99, ...overrides });

/** The farm with a pest of `pestId` on `tile`, its move planned. */
function withPest(state: FarmState, pestId: string, tile: number): FarmState {
    const next = structuredClone(state);
    const pest: FarmPest = { id: next.nextPestId++, pestId, tile, age: 0, intent: { kind: "move", tile } };
    next.pests.push(pest);
    pest.intent = planIntent(next, pest, CONTENT.pests[pestId]!, createRng(7));
    return next;
}

const plant = (state: FarmState, tile: number, slot = 0) => stepFarm(state, { type: "plant", tile, slot }, ctx).state;

/** A farm whose next Advance has this weather. */
const farmWith = (weather: string) => ({ ...farm(), turnWeather: [weather as FarmState["turnWeather"][number]] });
/** `cropId` ripe on each of `tiles`, kept wet. */
const ripe = (state: FarmState, cropId: string, tiles: number[]): FarmState => ({
    ...state,
    tiles: state.tiles.map((tile, i) =>
        tiles.includes(i)
            ? { ...tile, moisture: 3, crop: { cropId, stage: CONTENT.crops[cropId]!.stages, ripeTurns: 0, held: false, rotten: false } }
            : tile,
    ),
});
/** Every mutation certain to sprout once its recipe holds. */
const sure = (chance = 1): FarmContext => ({
    ...ctx,
    mutations: Object.fromEntries(Object.entries(CONTENT.mutations).map(([id, mutation]) => [id, { ...mutation, chance }])),
});

/** Advances with every owned tile kept wet, so weather can't stall growth. */
function advanceWet(state: FarmState, times: number): FarmState {
    let next = state;
    for (let i = 0; i < times; i++) {
        next = { ...next, tiles: next.tiles.map((tile) => (tile.owned ? { ...tile, moisture: 3 } : tile)) };
        next = stepFarm(next, { type: "advance" }, ctx).state;
    }
    return next;
}

describe("farm", () => {
    it("starts as a startSize square in the middle", () => {
        const state = newFarm(config, 1, 2, NOW);
        assert.equal(state.tiles.filter((tile) => tile.owned).length, config.startSize ** 2);
        assert.ok(state.tiles[MID]!.owned);
        assert.equal(state.labor, config.laborPerTurn);
    });

    it("banks a turn every turnHours, up to the cap, and stops the clock when full", () => {
        const empty = { ...newFarm(config, 1, 2, NOW), turnsBanked: 0 };
        const later = accrue(empty, config, new Date(NOW.getTime() + config.turnHours * HOUR * 1.5));
        assert.equal(later.turnsBanked, 1);
        assert.equal(nextTurnAt(later, config)!.getTime(), NOW.getTime() + config.turnHours * HOUR * 2);
        const full = accrue(empty, config, new Date(NOW.getTime() + config.turnHours * HOUR * 100));
        assert.equal(full.turnsBanked, config.maxTurnsBanked);
        assert.equal(nextTurnAt(full, config), null);
    });

    it("won't advance with no turns banked", () => {
        assert.throws(() => stepFarm(farm({ turnsBanked: 0 }), { type: "advance" }, ctx), FarmRuleError);
    });

    it("plants from the Seed Bag for free and grows to ripe, then harvests", () => {
        const planted = stepFarm(farm(), { type: "plant", tile: MID, slot: 0 }, ctx);
        assert.deepEqual(planted.seedUsed, { slot: 0, itemId: "wheat-seeds", from: 5 });
        assert.equal(planted.state.labor, config.laborPerTurn);

        const ripe = advanceWet(planted.state, CONTENT.crops.wheat!.stages);
        assert.throws(() => stepFarm(planted.state, { type: "harvest", tile: MID }, ctx), FarmRuleError);
        const harvested = stepFarm(ripe, { type: "harvest", tile: MID }, ctx);
        const wheat = harvested.gains.find((entry) => entry.itemId === "wheat")!;
        assert.ok(wheat.quantity >= CONTENT.crops.wheat!.yield.min);
        assert.equal(harvested.xp, CONTENT.crops.wheat!.xp);
        assert.equal(harvested.state.tiles[MID]!.crop, null);
        assert.equal(harvested.state.tiles[MID]!.fertility, config.startFertility - CONTENT.crops.wheat!.fertilityCost);
    });

    it("doesn't grow a dry crop on a clear day", () => {
        const dry = stepFarm(farmWith("clear"), { type: "plant", tile: MID, slot: 0 }, ctx).state;
        assert.equal(stepFarm(dry, { type: "advance" }, ctx).state.tiles[MID]!.crop!.stage, 0);
        const wet = { ...dry, turnWeather: ["clear" as const], tiles: dry.tiles.map((tile, i) => (i === MID ? { ...tile, moisture: 1 } : tile)) };
        const grown = stepFarm(wet, { type: "advance" }, ctx).state.tiles[MID]!;
        assert.equal(grown.crop!.stage, 1);
        assert.equal(grown.moisture, 0);
    });

    it("pays more for waiting on a ripe crop, until it rots", () => {
        const ripe = advanceWet(stepFarm(farm(), { type: "plant", tile: MID, slot: 0 }, ctx).state, CONTENT.crops.wheat!.stages);
        const pushed = advanceWet(ripe, 2);
        assert.equal(pushed.tiles[MID]!.crop!.ripeTurns, 2);
        // rotChances[3] is 1 in this config: the fourth wait always rots.
        const rotted = advanceWet(pushed, 2);
        assert.equal(rotted.tiles[MID]!.crop!.rotten, true);
        assert.throws(() => stepFarm(rotted, { type: "harvest", tile: MID }, ctx), FarmRuleError);
    });

    it("Hold stops a ripe crop rotting or improving for one Advance", () => {
        let state = advanceWet(stepFarm(farm(), { type: "plant", tile: MID, slot: 0 }, ctx).state, CONTENT.crops.wheat!.stages);
        state = { ...state, labor: 3 };
        state = stepFarm(state, { type: "play", inventoryId: card("farm.hold"), tile: MID }, ctx).state;
        state = advanceWet(state, 1);
        assert.equal(state.tiles[MID]!.crop!.ripeTurns, 0);
        assert.equal(state.tiles[MID]!.crop!.held, false);
    });

    it("charges Labor, and spends a card charge", () => {
        const state = farm({ labor: 1 });
        const result = stepFarm(state, { type: "play", inventoryId: card("farm.bucket-line"), tile: MID }, ctx);
        assert.equal(result.state.labor, 0);
        assert.deepEqual(result.cardPlayed, { inventoryId: card("farm.bucket-line"), chargesLeft: 9 });
        const row = Math.floor(MID / GEO_FARM_SIZE);
        const watered = result.state.tiles.filter((tile, i) => Math.floor(i / GEO_FARM_SIZE) === row && tile.moisture === 1);
        assert.equal(watered.length, config.startSize);
        assert.throws(() => stepFarm(result.state, { type: "water", tile: MID }, ctx), FarmRuleError);
    });

    it("Scythe Sweep harvests every ripe crop in reach", () => {
        let state = farm();
        const row = Math.floor(MID / GEO_FARM_SIZE);
        for (const tile of [MID - 1, MID, MID + 1]) state = stepFarm(state, { type: "plant", tile, slot: 0 }, ctx).state;
        state = { ...advanceWet(state, CONTENT.crops.wheat!.stages), labor: 3 };
        const result = stepFarm(state, { type: "play", inventoryId: card("farm.scythe-sweep"), tile: MID }, ctx);
        assert.equal(result.state.tiles.filter((tile, i) => Math.floor(i / GEO_FARM_SIZE) === row && tile.crop).length, 0);
        assert.equal(result.xp, CONTENT.crops.wheat!.xp * 3);
    });

    it("Read the Sky shows three turns of weather until the next Advance", () => {
        assert.equal(forecast(farm(), config).length, 1);
        const read = stepFarm(farm(), { type: "play", inventoryId: card("farm.read-sky"), tile: 0 }, ctx).state;
        assert.equal(forecast(read, config).length, 3);
        assert.equal(forecast(stepFarm(read, { type: "advance" }, ctx).state, config).length, 1);
    });

    it("forecast is the weather that comes", () => {
        const state = farm();
        const said = forecast(state, config)[0]!;
        const log = stepFarm(state, { type: "advance" }, ctx).log[0]!;
        assert.match(log.toLowerCase(), new RegExp(said));
    });

    it("unlocks only tiles touching the farm, each dearer than the last", () => {
        const state = farm();
        assert.ok(!isUnlockable(state, 0));
        const edge = MID - 2;
        const first = stepFarm(state, { type: "unlock", tile: edge }, ctx);
        assert.equal(first.coins, config.unlockCost.first);
        const second = stepFarm(first.state, { type: "unlock", tile: edge - 1 }, ctx);
        assert.equal(second.coins, config.unlockCost.first + config.unlockCost.step);
        assert.throws(() => stepFarm(state, { type: "unlock", tile: 0 }, ctx), FarmRuleError);
    });

    it("blueprints any tile, costing nothing", () => {
        const result = stepFarm(farm({ labor: 0 }), { type: "blueprint", tile: 0, cropId: "melon" }, ctx);
        assert.equal(result.state.tiles[0]!.blueprint, "melon");
        assert.throws(() => stepFarm(farm(), { type: "blueprint", tile: 0, cropId: "nope" }, ctx), FarmRuleError);
    });

    describe("pests", () => {
        it("a mouse eats the crop it telegraphed, and the crop is gone", () => {
            const state = withPest(plant(farm(), MID + 1), "field-mouse", MID);
            assert.deepEqual(state.pests[0]!.intent, { kind: "eat", tile: MID + 1 });
            const after = advanceWet(state, 1);
            assert.equal(after.tiles[MID + 1]!.crop, null);
            assert.equal(after.pests[0]!.tile, MID + 1);
        });

        it("misses if the crop is cleared first", () => {
            let state = { ...withPest(plant(farm(), MID + 1), "field-mouse", MID), labor: 3 };
            state = stepFarm(state, { type: "clear", tile: MID + 1 }, ctx).state;
            const result = stepFarm(state, { type: "advance" }, ctx);
            assert.ok(result.log.some((line) => line.includes("found nothing to eat")));
        });

        it("Swat clears the pests on a tile for 2 Labor, with drops and XP", () => {
            const state = { ...withPest(farm(), "field-mouse", MID), labor: 3 };
            const result = stepFarm(state, { type: "swat", tile: MID }, ctx);
            assert.equal(result.state.pests.length, 0);
            assert.equal(result.state.labor, 1);
            assert.ok(result.gains.some((gain) => gain.itemId === "mouse-tail"));
            assert.equal(result.xp, CONTENT.pests["field-mouse"]!.xp);
            assert.throws(() => stepFarm(result.state, { type: "swat", tile: MID }, ctx), FarmRuleError);
        });

        it("Snap Trap catches a pest moving onto it, and lasts one Advance", () => {
            let state = { ...withPest(plant(farm(), MID + 1), "field-mouse", MID), labor: 3 };
            state = stepFarm(state, { type: "play", inventoryId: card("farm.snap-trap"), tile: MID + 1 }, ctx).state;
            const result = stepFarm(state, { type: "advance" }, ctx);
            assert.equal(result.state.pests.length, 0);
            assert.ok(result.state.tiles[MID + 1]!.crop, "caught before it ate");
            assert.ok(result.gains.some((gain) => gain.itemId === "mouse-tail"));

            const wasted = stepFarm({ ...farm(), labor: 3 }, { type: "play", inventoryId: card("farm.snap-trap"), tile: MID }, ctx).state;
            assert.equal(stepFarm(wasted, { type: "advance" }, ctx).state.tiles[MID]!.trap, false);
        });

        it("Smoke clears every pest in a 3×3, and ripe crops in it lose their wait", () => {
            let state = advanceWet(plant(farm(), MID), CONTENT.crops.wheat!.stages + 1);
            assert.equal(state.tiles[MID]!.crop!.ripeTurns, 1);
            state = { ...withPest(withPest(state, "mite", MID - 1), "earthworm", MID + GEO_FARM_SIZE + 1), labor: 3 };
            const result = stepFarm(state, { type: "play", inventoryId: card("farm.smoke"), tile: MID }, ctx);
            assert.equal(result.state.pests.length, 0);
            assert.equal(result.state.tiles[MID]!.crop!.ripeTurns, 0);
            assert.throws(() => stepFarm(result.state, { type: "play", inventoryId: card("farm.smoke"), tile: MID }, ctx), FarmRuleError);
        });

        it("Bait Ring pulls the pests around onto the middle tile", () => {
            let state = { ...withPest(withPest(farm(), "earthworm", MID - 1), "mite", MID + GEO_FARM_SIZE), labor: 3 };
            state = stepFarm(state, { type: "play", inventoryId: card("farm.bait-ring"), tile: MID }, ctx).state;
            assert.deepEqual(state.pests.map((pest) => pest.tile), [MID, MID]);
        });

        it("an earthworm drains its tile's fertility", () => {
            const after = advanceWet(withPest(farm(), "earthworm", MID), 1);
            assert.equal(after.tiles[MID]!.fertility, config.startFertility - 2);
        });

        it("a mite stops its crop growing, then breeds next door", () => {
            let state = plant(plant(farm(), MID), MID + 1);
            state = withPest(state, "mite", MID);
            state = advanceWet(state, 1);
            assert.equal(state.tiles[MID]!.crop!.stage, 0, "sapped");
            assert.equal(state.tiles[MID + 1]!.crop!.stage, 1);
            assert.deepEqual(state.pests[0]!.intent, { kind: "breed", tile: MID + 1 });
            state = advanceWet(state, 1);
            assert.equal(state.pests.length, 2);
            assert.ok(state.pests.some((pest) => pest.tile === MID + 1));
        });

        it("arrive next to the crops they like, but not before fromTurn", () => {
            const eager = { ...ctx, config: { ...config, pests: { fromTurn: 2, chancePerCrop: 1, maxChance: 1, max: 4 } } };
            let state = plant(farm(), MID, 1);
            const wet = (s: FarmState) => ({ ...s, tiles: s.tiles.map((tile) => (tile.owned ? { ...tile, moisture: 3 } : tile)) });
            state = stepFarm(wet(state), { type: "advance" }, eager).state;
            assert.equal(state.pests.length, 0);
            state = stepFarm(wet(state), { type: "advance" }, eager).state;
            assert.equal(state.pests.length, 1);
            const pest = state.pests[0]!;
            assert.ok(CONTENT.pests[pest.pestId]!.likes.includes("melon"));
            const dx = Math.abs((pest.tile % GEO_FARM_SIZE) - (MID % GEO_FARM_SIZE));
            const dy = Math.abs(Math.floor(pest.tile / GEO_FARM_SIZE) - Math.floor(MID / GEO_FARM_SIZE));
            assert.ok(dx <= 1 && dy <= 1);
        });

        it("upgrades a farm saved before pests and mutations", () => {
            const { pests: _pests, nextPestId: _next, lab: _lab, turnWeather: _weather, home: _home, ...old } = newFarm(config, 1, 2, NOW);
            const v1 = { ...old, version: 1, tiles: old.tiles.map(({ trap: _trap, pollinated: _pollinated, structure: _structure, ...tile }) => tile) };
            const upgraded = upgradeFarm(v1);
            assert.equal(upgraded.version, 5);
            assert.deepEqual(upgraded.turnWeather, []);
            assert.equal(upgraded.home, null);
            assert.equal(upgraded.tiles[MID]!.structure, null);
            assert.deepEqual(upgraded.pests, []);
            assert.deepEqual(upgraded.lab, []);
            assert.equal(upgraded.tiles[MID]!.trap, false);
            assert.equal(upgraded.tiles[MID]!.pollinated, false);
        });
    });

    describe("mutations", () => {
        it("sprouts on an empty tile when the recipe holds", () => {
            const state = ripe(farmWith("heatwave"), "wheat", [MID - 1, MID + 1]);
            const result = stepFarm(state, { type: "advance" }, sure());
            assert.equal(result.state.tiles[MID]!.crop?.cropId, "emberwheat");
            assert.ok(result.log.some((line) => line.includes("Emberwheat")));
        });

        it("doesn't sprout without the weather, or with too few parents", () => {
            const wrongSky = ripe(farmWith("clear"), "wheat", [MID - 1, MID + 1]);
            assert.equal(stepFarm(wrongSky, { type: "advance" }, sure()).state.tiles[MID]!.crop, null);
            const oneParent = ripe(farmWith("heatwave"), "wheat", [MID - 1]);
            assert.ok(stepFarm(oneParent, { type: "advance" }, sure()).state.tiles.every((tile) => tile.crop?.cropId !== "emberwheat"));
        });

        it("can need a pest nearby", () => {
            let state = ripe(farm(), "pumpkin", [MID - 1]);
            assert.ok(stepFarm(state, { type: "advance" }, sure()).state.tiles.every((tile) => tile.crop?.cropId !== "grinning-gourd"));
            state = withPest(state, "field-mouse", MID + 1);
            state.pests[0]!.intent = { kind: "move", tile: MID + 1 };
            assert.equal(stepFarm(state, { type: "advance" }, sure()).state.tiles[MID]!.crop?.cropId, "grinning-gourd");
        });

        it("Hand Pollinate boosts the odds on its tile for one Advance", () => {
            let state = { ...ripe(farmWith("heatwave"), "wheat", [MID - 1, MID + 1]), labor: 3 };
            // 0.5 × pollinateBoost 2 = certain.
            state = stepFarm(state, { type: "play", inventoryId: card("farm.hand-pollinate"), tile: MID }, sure(0.5)).state;
            assert.equal(state.tiles[MID]!.pollinated, true);
            const after = stepFarm(state, { type: "advance" }, sure(0.5)).state;
            assert.equal(after.tiles[MID]!.crop?.cropId, "emberwheat");
            assert.equal(after.tiles[MID]!.pollinated, false);
            assert.throws(() => stepFarm({ ...after, labor: 3 }, { type: "play", inventoryId: card("farm.hand-pollinate"), tile: MID }, ctx), FarmRuleError);
        });

        it("grows and harvests like a crop, with no seeds back", () => {
            const mutation = CONTENT.mutations.emberwheat!;
            const state = {
                ...farm(),
                tiles: farm().tiles.map((tile, i) =>
                    i === MID ? { ...tile, crop: { cropId: mutation.id, stage: mutation.stages, ripeTurns: 0, held: false, rotten: false } } : tile,
                ),
            };
            const result = stepFarm(state, { type: "harvest", tile: MID }, ctx);
            assert.deepEqual(result.gains.map((gain) => gain.itemId), [mutation.produce]);
            assert.equal(result.xp, mutation.xp);
        });
    });

    describe("structures", () => {
        const place = (state: FarmState, structureId: string, tile: number) =>
            stepFarm(state, { type: "place", tile, itemId: CONTENT.structures[structureId]!.itemId }, ctx).state;

        it("places from the inventory onto an empty tile, and picks back up", () => {
            const placed = stepFarm(farm(), { type: "place", tile: MID, itemId: "structure.pond" }, ctx);
            assert.equal(placed.state.tiles[MID]!.structure?.structureId, "pond");
            assert.deepEqual(placed.itemsUsed, [{ itemId: "structure.pond", quantity: 1 }]);
            assert.throws(() => stepFarm(placed.state, { type: "plant", tile: MID, slot: 0 }, ctx), FarmRuleError);
            assert.throws(() => stepFarm(plant(farm(), MID), { type: "place", tile: MID, itemId: "structure.pond" }, ctx), FarmRuleError);
            assert.throws(() => stepFarm(farm(), { type: "place", tile: MID, itemId: "structure.pond" }, { ...ctx, held: {} }), FarmRuleError);
            const picked = stepFarm(placed.state, { type: "pickup", tile: MID }, ctx);
            assert.equal(picked.state.tiles[MID]!.structure, null);
            assert.deepEqual(picked.gains, [{ itemId: "structure.pond", quantity: 1 }]);
        });

        it("a Pond keeps the tiles beside it wet, and its frog eats a pest", () => {
            let state = place(farm(), "pond", MID);
            state = withPest(state, "earthworm", MID + 1);
            const after = stepFarm(state, { type: "advance" }, ctx);
            assert.equal(after.state.pests.length, 0);
            assert.ok(after.log.some((line) => line.includes("frog")));
            assert.ok(after.state.tiles[MID - 1]!.moisture >= 1);
            assert.equal(after.gains.length, 0, "the frog had it: no drops");
        });

        it("a Compost Bin fills on harvest and clear, then feeds the soil around", () => {
            let state = { ...place(farm(), "compost-bin", MID), labor: 3 };
            state = stepFarm(plant(state, MID + 1), { type: "clear", tile: MID + 1 }, ctx).state;
            assert.equal(state.tiles[MID]!.structure!.compost, 1);
            // A crop above the bin, so fallow rest can't be what raises its soil.
            state = plant(state, MID - GEO_FARM_SIZE);
            state = advanceWet({ ...state, tiles: state.tiles.map((tile, i) => (i === MID - GEO_FARM_SIZE ? { ...tile, fertility: 2 } : tile)) }, 1);
            assert.equal(state.tiles[MID]!.structure!.compost, 0);
            assert.equal(state.tiles[MID - GEO_FARM_SIZE]!.fertility, 3);
        });

        it("a Pest Cage keeps a pest alive, which counts for mutation recipes", () => {
            let state = { ...place(ripe(farm(), "pumpkin", [MID - 1]), "pest-cage", MID + 1), labor: 3 };
            state = withPest(state, "field-mouse", MID + GEO_FARM_SIZE + 1);
            state = stepFarm(state, { type: "cage", tile: MID + GEO_FARM_SIZE + 1 }, ctx).state;
            assert.equal(state.pests.length, 0);
            assert.equal(state.tiles[MID + 1]!.structure!.caged, "field-mouse");
            assert.throws(() => stepFarm(state, { type: "pickup", tile: MID + 1 }, ctx), FarmRuleError);
            assert.equal(stepFarm(state, { type: "advance" }, sure()).state.tiles[MID]!.crop?.cropId, "grinning-gourd");
            const released = stepFarm(state, { type: "release", tile: MID + 1 }, ctx);
            assert.equal(released.state.tiles[MID + 1]!.structure!.caged, null);
            assert.ok(released.gains.some((gain) => gain.itemId === "mouse-tail"));
        });

        it("a Beehive boosts mutation odds around it", () => {
            // 0.5 × hive 1.5 isn't certain, but 0.7 × 1.5 is.
            const state = place(ripe(farmWith("heatwave"), "wheat", [MID - 1, MID + 1]), "beehive", MID + GEO_FARM_SIZE);
            const noSwarm = { ...sure(0.7), structures: { ...CONTENT.structures, beehive: { ...CONTENT.structures.beehive!, effect: { kind: "beehive" as const, boost: 1.5, swarmChance: 0 } } } };
            assert.equal(stepFarm(state, { type: "advance" }, noSwarm).state.tiles[MID]!.crop?.cropId, "emberwheat");
        });

        it("a Jukebox's tune decides which pest comes", () => {
            const eager = { ...ctx, config: { ...config, pests: { fromTurn: 0, chancePerCrop: 1, maxChance: 1, max: 4 } } };
            let state = { ...place(plant(plant(farm(), MID - 1), MID + 1, 1), "jukebox", MID), labor: 3 };
            state = stepFarm(state, { type: "tune", tile: MID, pestId: "earthworm" }, eager).state;
            const boosted = { ...eager, structures: { ...CONTENT.structures, jukebox: { ...CONTENT.structures.jukebox!, effect: { kind: "jukebox" as const, boost: 1e9 } } } };
            for (let seed = 1; seed <= 5; seed++) {
                const after = stepFarm({ ...state, seed }, { type: "advance" }, boosted).state;
                assert.equal(after.pests[0]?.pestId, "earthworm");
            }
        });
    });

    describe("weather", () => {
        const sky = (weather: FarmState["turnWeather"][number], cropId = "wheat", stage = 1) => ({
            ...farm(),
            turnWeather: [weather],
            tiles: farm().tiles.map((tile, i) =>
                i === MID ? { ...tile, moisture: 3, crop: { cropId, stage, ripeTurns: 0, held: false, rotten: false } } : tile,
            ),
        });

        it("each banked turn keeps the weather of the period it came in over", () => {
            const period = config.turnHours * HOUR;
            const lookup = (start: number) => (start === NOW.getTime() ? "rain" : start === NOW.getTime() + period ? "storm" : "clear");
            const state = accrue({ ...farm({ turnsBanked: 0 }), turnWeather: [] }, config, new Date(NOW.getTime() + period * 2.5), lookup);
            assert.deepEqual(state.turnWeather, ["rain", "storm"]);
            assert.deepEqual(forecast({ ...state, skyRead: true }, config, () => "frost"), ["rain", "storm", "frost"]);
            const played = stepFarm(state, { type: "advance" }, ctx);
            assert.match(played.log[0]!, /Rain/);
            assert.deepEqual(played.state.turnWeather, ["storm"]);
        });

        it("a storm waters like rain and can flatten crops in the open", () => {
            const stormy = { ...ctx, config: { ...config, weather: { ...config.weather, stormFlattenChance: 1 } } };
            const after = stepFarm(sky("storm"), { type: "advance" }, stormy);
            assert.equal(after.state.tiles[MID]!.crop, null);
            assert.ok(after.log.some((line) => line.includes("flattened")));
        });

        it("a frost stops growth, and kills young crops in the open", () => {
            const young = stepFarm(sky("frost", "wheat", 1), { type: "advance" }, ctx).state;
            assert.equal(young.tiles[MID]!.crop, null);
            const older = stepFarm(sky("frost", "melon", 3), { type: "advance" }, ctx).state;
            assert.equal(older.tiles[MID]!.crop!.stage, 3);
        });

        it("a Greenhouse shelters the tiles around it from the weather", () => {
            const state = stepFarm(sky("frost", "wheat", 1), { type: "place", tile: MID + 1, itemId: "structure.greenhouse" }, ctx).state;
            const after = stepFarm(state, { type: "advance" }, ctx).state;
            assert.equal(after.tiles[MID]!.crop!.stage, 2, "grew as on a clear day");
        });

        it("sets the home region to a coarse square, then only after the cooldown", () => {
            const set = stepFarm(farm(), { type: "home", latitude: 51.5072, longitude: -0.1276 }, ctx).state;
            assert.deepEqual({ latitude: set.home!.latitude, longitude: set.home!.longitude }, { latitude: 51.5, longitude: 0 });
            assert.throws(() => stepFarm(set, { type: "home", latitude: 51.6, longitude: 0.1 }, ctx), FarmRuleError);
            assert.throws(() => stepFarm(set, { type: "home", latitude: 40.7, longitude: -74 }, ctx), FarmRuleError);
            const later = { ...ctx, now: new Date(NOW.getTime() + (config.weather.homeCooldownDays + 1) * 24 * HOUR) };
            assert.equal(stepFarm(set, { type: "home", latitude: 40.7, longitude: -74 }, later).state.home!.latitude, 40.5);
        });
    });
});
