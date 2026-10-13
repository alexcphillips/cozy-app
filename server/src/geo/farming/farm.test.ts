import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GEO_FARM_SIZE } from "@cozy/shared/geo";
import { CONTENT, FARMING } from "../content";
import {
    accrue,
    FarmRuleError,
    forecast,
    isUnlockable,
    newFarm,
    nextTurnAt,
    stepFarm,
    type FarmContext,
    type FarmState,
} from "./farm";

const NOW = new Date("2026-10-13T12:00:00Z");
const HOUR = 3_600_000;
const config = { ...FARMING, rotChances: [0, 0, 0, 1] };
const hand = ["farm.bucket-line", "farm.careful-pick", "farm.scythe-sweep", "farm.hold", "farm.read-sky", "farm.ripen"].map(
    (cardId, i) => ({ inventoryId: `inv-${i}`, itemId: `card.${cardId}`, cardId, chargesLeft: 10 }),
);
const ctx: FarmContext = { crops: CONTENT.crops, config, hand, seedBag: [{ slot: 0, itemId: "wheat-seeds", quantity: 5 }] };
const card = (cardId: string) => hand.find((entry) => entry.cardId === cardId)!.inventoryId;

/** The middle tile: owned on every new farm. */
const MID = Math.floor((GEO_FARM_SIZE * GEO_FARM_SIZE) / 2);

const farm = (overrides: Partial<FarmState> = {}): FarmState => ({ ...newFarm(config, 1, 2, NOW), turnsBanked: 99, ...overrides });

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
        let weatherSeed = 0;
        while (forecast(newFarm(config, 1, weatherSeed, NOW), config)[0] !== "clear") weatherSeed += 1;
        const dry = stepFarm({ ...farm(), weatherSeed }, { type: "plant", tile: MID, slot: 0 }, ctx).state;
        assert.equal(stepFarm(dry, { type: "advance" }, ctx).state.tiles[MID]!.crop!.stage, 0);
        const wet = { ...dry, tiles: dry.tiles.map((tile, i) => (i === MID ? { ...tile, moisture: 1 } : tile)) };
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
});
