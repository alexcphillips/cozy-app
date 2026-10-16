import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GEO_FARM_SIZE, type GeoFarmWeather } from "@cozy/shared/geo";
import { CONTENT, FARMING } from "../content";
import { createRng } from "../engine/rng";
import {
    catchUp,
    FarmRuleError,
    forecast,
    isUnlockable,
    newFarm,
    nextTurnAt,
    refreshOrders,
    weekOf,
    withFortune,
    weekEndsAt,
    globalEventFor,
    activeGlobalEvent,
    contestCropFor,
    planIntent,
    stepFarm,
    tickFarm,
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
    events: { ...FARMING.events, chance: 0 },
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
    "farm.hazmat-scrub",
    "farm.controlled-leak",
    "farm.tear-the-veil",
    "farm.mulch",
    "farm.hex-the-earth",
    "farm.coax",
    "farm.compost-spread",
    "farm.lime-dust",
    "farm.moon-rite",
    "farm.exterminators-oath",
    "farm.rush-order",
    "farm.chain-reaction",
].map(
    (cardId, i) => ({ inventoryId: `inv-${i}`, itemId: `card.${cardId}`, cardId, chargesLeft: 10 }),
);
const ctx: FarmContext = {
    crops: CONTENT.crops,
    mutations: CONTENT.mutations,
    pests: CONTENT.pests,
    structures: CONTENT.structures,
    events: CONTENT.farmEvents,
    sellValue: (itemId) => CONTENT.items[itemId]?.sellValue ?? 1,
    config,
    now: NOW,
    hand,
    held: {
        ...Object.fromEntries(Object.values(CONTENT.structures).map((structure) => [structure.itemId, 2])),
        "wheat-seeds": 5,
        "melon-seeds": 5,
    },
    farmingLevel: 1,
};
const card = (cardId: string) => hand.find((entry) => entry.cardId === cardId)!.inventoryId;

/** The middle tile: owned on every new farm. */
const MID = Math.floor((GEO_FARM_SIZE * GEO_FARM_SIZE) / 2);

const farm = (overrides: Partial<FarmState> = {}): FarmState => ({ ...newFarm(config, 1, 2, NOW), ...overrides });

/** The farm with a pest of `pestId` on `tile`, its move planned. */
function withPest(state: FarmState, pestId: string, tile: number): FarmState {
    const next = structuredClone(state);
    const pest: FarmPest = { id: next.nextPestId++, pestId, tile, age: 0, intent: { kind: "move", tile }, hp: CONTENT.pests[pestId]!.hp };
    next.pests.push(pest);
    pest.intent = planIntent(next, pest, CONTENT.pests[pestId]!, createRng(7));
    return next;
}

const plant = (state: FarmState, tile: number, itemId = "wheat-seeds") => stepFarm(state, { type: "plant", tile, itemId }, ctx).state;

/** `context` with every turn under this sky. */
const under = (weather: GeoFarmWeather, context: FarmContext = ctx): FarmContext => ({ ...context, weather: () => weather });
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

/** A structure from the (test) inventory onto a tile. */
const place = (state: FarmState, structureId: string, tile: number) =>
    stepFarm(state, { type: "place", tile, itemId: CONTENT.structures[structureId]!.itemId }, ctx).state;

/** Turns with every owned tile kept wet, so weather can't stall growth. */
function advanceWet(state: FarmState, times: number): FarmState {
    let next = state;
    for (let i = 0; i < times; i++) {
        next = { ...next, tiles: next.tiles.map((tile) => (tile.owned ? { ...tile, moisture: 3 } : tile)) };
        next = tickFarm(next, ctx).state;
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

    it("takes a turn every turnHours on its own, keeping the clock's phase", () => {
        const period = config.turnHours * HOUR;
        const early = catchUp(farm(), { ...ctx, now: new Date(NOW.getTime() + period * 0.9) });
        assert.equal(early.turns, 0);
        assert.equal(early.state.turn, 0);
        const later = catchUp(farm(), { ...ctx, now: new Date(NOW.getTime() + period * 1.5) });
        assert.equal(later.turns, 1);
        assert.equal(later.state.turn, 1);
        assert.equal(nextTurnAt(later.state, config).getTime(), NOW.getTime() + period * 2);
        assert.match(later.log[0]!, /ran 1 cycle\./);
    });

    it("waits for the player after maxTurnsAway turns, then restarts the clock", () => {
        const period = config.turnHours * HOUR;
        const back = new Date(NOW.getTime() + period * 100.5);
        const away = catchUp(farm(), { ...ctx, now: back });
        assert.equal(away.turns, config.maxTurnsAway);
        assert.equal(away.state.turn, config.maxTurnsAway);
        assert.equal(nextTurnAt(away.state, config).getTime(), back.getTime() + period);
        assert.match(away.log[0]!, /then waited for you/);
    });

    it("Labor refills to more at higher farming levels", () => {
        const [first, second] = config.laborLevels;
        const refill = (farmingLevel: number) => tickFarm(farm({ labor: 0 }), { ...ctx, farmingLevel }).state.labor;
        assert.equal(refill(1), config.laborPerTurn);
        assert.equal(refill(first! - 1), config.laborPerTurn);
        assert.equal(refill(first!), config.laborPerTurn + 1);
        assert.equal(refill(second!), config.laborPerTurn + 2);
        assert.equal(refill(99), config.laborPerTurn + config.laborLevels.length);
    });

    it("plants from the inventory for free and grows to ripe, then harvests", () => {
        const planted = stepFarm(farm(), { type: "plant", tile: MID, itemId: "wheat-seeds" }, ctx);
        assert.deepEqual(planted.itemsUsed, [{ itemId: "wheat-seeds", quantity: 1 }]);
        assert.equal(planted.state.labor, config.laborPerTurn);
        assert.throws(() => stepFarm(farm(), { type: "plant", tile: MID, itemId: "carrot-seeds" }, ctx), /none of those seeds/);
        assert.throws(() => stepFarm(farm(), { type: "plant", tile: MID, itemId: "wheat" }, ctx), /aren't seeds/);

        const ripe = advanceWet(planted.state, CONTENT.crops.wheat!.stages);
        assert.throws(() => stepFarm(planted.state, { type: "harvest", tile: MID }, ctx), FarmRuleError);
        const harvested = stepFarm(ripe, { type: "harvest", tile: MID }, ctx);
        const wheat = harvested.gains.find((entry) => entry.itemId === "wheat")!;
        assert.ok(wheat.quantity >= CONTENT.crops.wheat!.yield.min);
        assert.equal(harvested.xp, CONTENT.crops.wheat!.xp);
        assert.equal(harvested.state.tiles[MID]!.crop, null);
        assert.equal(harvested.state.tiles[MID]!.fertility, config.startFertility - CONTENT.crops.wheat!.fertilityCost);
    });

    it("Farming Fortune multiplies a harvest: each 100 adds it again, the fraction a chance of 1 more", () => {
        const rng = createRng(1);
        assert.equal(withFortune(3, 0, rng), 3);
        assert.equal(withFortune(3, 100, rng), 6);
        assert.equal(withFortune(3, 1000, rng), 33);
        assert.equal(withFortune(3, -50, rng), 3);
        const rolls = Array.from({ length: 200 }, () => withFortune(3, 50, rng));
        assert.ok(rolls.every((amount) => amount === 4 || amount === 5));
        assert.ok(rolls.includes(4) && rolls.includes(5));
    });

    it("harvests with Farming Fortune give more crops, but not more seeds", () => {
        const ripeWheat = ripe(farm(), "wheat", [MID]);
        const plain = stepFarm(ripeWheat, { type: "harvest", tile: MID }, ctx);
        const lucky = stepFarm(ripeWheat, { type: "harvest", tile: MID }, { ...ctx, fortune: 200 });
        const amount = (result: typeof plain, itemId: string) => result.gains.find((gain) => gain.itemId === itemId)?.quantity ?? 0;
        assert.equal(amount(lucky, "wheat"), amount(plain, "wheat") * 3);
        assert.equal(amount(lucky, "wheat-seeds"), amount(plain, "wheat-seeds"));
        assert.equal(lucky.harvested[0]!.quantity, amount(lucky, "wheat"), "contests count the fortune crops");
    });

    it("doesn't grow a dry crop on a clear day", () => {
        const dry = stepFarm(farm(), { type: "plant", tile: MID, itemId: "wheat-seeds" }, ctx).state;
        assert.equal(tickFarm(dry, under("clear")).state.tiles[MID]!.crop!.stage, 0);
        const wet = { ...dry, tiles: dry.tiles.map((tile, i) => (i === MID ? { ...tile, moisture: 1 } : tile)) };
        const grown = tickFarm(wet, under("clear")).state.tiles[MID]!;
        assert.equal(grown.crop!.stage, 1);
        assert.equal(grown.moisture, 0);
    });

    it("pays more for waiting on a ripe crop, until it rots", () => {
        const ripe = advanceWet(stepFarm(farm(), { type: "plant", tile: MID, itemId: "wheat-seeds" }, ctx).state, CONTENT.crops.wheat!.stages);
        const pushed = advanceWet(ripe, 2);
        assert.equal(pushed.tiles[MID]!.crop!.ripeTurns, 2);
        // rotChances[3] is 1 in this config: the fourth wait always rots.
        const rotted = advanceWet(pushed, 2);
        assert.equal(rotted.tiles[MID]!.crop!.rotten, true);
        assert.throws(() => stepFarm(rotted, { type: "harvest", tile: MID }, ctx), FarmRuleError);
    });

    it("Hold stops a ripe crop rotting or improving for one turn", () => {
        let state = advanceWet(stepFarm(farm(), { type: "plant", tile: MID, itemId: "wheat-seeds" }, ctx).state, CONTENT.crops.wheat!.stages);
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
        for (const tile of [MID - 1, MID, MID + 1]) state = stepFarm(state, { type: "plant", tile, itemId: "wheat-seeds" }, ctx).state;
        state = { ...advanceWet(state, CONTENT.crops.wheat!.stages), labor: 3 };
        const result = stepFarm(state, { type: "play", inventoryId: card("farm.scythe-sweep"), tile: MID }, ctx);
        assert.equal(result.state.tiles.filter((tile, i) => Math.floor(i / GEO_FARM_SIZE) === row && tile.crop).length, 0);
        assert.equal(result.xp, CONTENT.crops.wheat!.xp * 3);
    });

    it("Read the Sky shows three turns of weather until the next turn", () => {
        assert.equal(forecast(farm(), config).length, 1);
        const read = stepFarm(farm(), { type: "play", inventoryId: card("farm.read-sky"), tile: 0 }, ctx).state;
        assert.equal(forecast(read, config).length, 3);
        assert.equal(forecast(tickFarm(read, ctx).state, config).length, 1);
    });

    it("forecast is the weather that comes", () => {
        const state = farm();
        const said = forecast(state, config)[0]!;
        const log = tickFarm(state, ctx).log[0]!;
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
            const result = tickFarm(state, ctx);
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

        it("Snap Trap catches a pest moving onto it, and lasts one turn", () => {
            let state = { ...withPest(plant(farm(), MID + 1), "field-mouse", MID), labor: 3 };
            state = stepFarm(state, { type: "play", inventoryId: card("farm.snap-trap"), tile: MID + 1 }, ctx).state;
            const result = tickFarm(state, ctx);
            assert.equal(result.state.pests.length, 0);
            assert.ok(result.state.tiles[MID + 1]!.crop, "caught before it ate");
            assert.ok(result.gains.some((gain) => gain.itemId === "mouse-tail"));

            const wasted = stepFarm({ ...farm(), labor: 3 }, { type: "play", inventoryId: card("farm.snap-trap"), tile: MID }, ctx).state;
            assert.equal(tickFarm(wasted, ctx).state.tiles[MID]!.trap, false);
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
            let state = plant(farm(), MID, "melon-seeds");
            const wet = (s: FarmState) => ({ ...s, tiles: s.tiles.map((tile) => (tile.owned ? { ...tile, moisture: 3 } : tile)) });
            state = tickFarm(wet(state), eager).state;
            assert.equal(state.pests.length, 0);
            state = tickFarm(wet(state), eager).state;
            assert.equal(state.pests.length, 1);
            const pest = state.pests[0]!;
            assert.ok(CONTENT.pests[pest.pestId]!.likes.includes("melon"));
            const dx = Math.abs((pest.tile % GEO_FARM_SIZE) - (MID % GEO_FARM_SIZE));
            const dy = Math.abs(Math.floor(pest.tile / GEO_FARM_SIZE) - Math.floor(MID / GEO_FARM_SIZE));
            assert.ok(dx <= 1 && dy <= 1);
        });

        it("upgrades a farm saved before pests and mutations", () => {
            const {
                pests: _pests,
                nextPestId: _next,
                lab: _lab,
                nextEvent: _nextEvent,
                activeEvent: _activeEvent,
                orders: _orders,
                blessings: _blessings,
                oath: _oath,
                rushOrder: _rush,
                ...old
            } = newFarm(config, 1, 2, NOW);
            const v1 = {
                ...old,
                version: 1,
                tiles: old.tiles.map(
                    ({ trap: _trap, pollinated: _pollinated, structure: _structure, waste: _waste, soil: _soil, soilOverlay: _overlay, limed: _limed, ...tile }) =>
                        tile,
                ),
            };
            const upgraded = upgradeFarm({ ...v1, turnsBanked: 3, turnWeather: ["rain"], home: { latitude: 51.5, longitude: 0, setAt: NOW.toISOString() } });
            assert.equal(upgraded.version, 13);
            assert.ok(!("turnsBanked" in upgraded) && !("turnWeather" in upgraded), "banked turns are dropped");
            assert.ok(!("home" in upgraded), "the home region is dropped");
            assert.equal(upgraded.pesthunterPoints, 0);
            assert.equal(upgraded.oath, 0);
            assert.deepEqual(upgraded.blessings, []);
            assert.equal(upgraded.tiles[MID]!.waste, false);
            assert.equal(upgraded.tiles[MID]!.soil, "normal");
            assert.equal(upgraded.nextEvent, null);
            assert.equal(upgraded.orders, null);
            assert.equal(upgraded.tiles[MID]!.structure, null);
            assert.deepEqual(upgraded.pests, []);
            assert.deepEqual(upgraded.lab, []);
            assert.equal(upgraded.tiles[MID]!.trap, false);
            assert.equal(upgraded.tiles[MID]!.pollinated, false);
        });
    });

    describe("mutations", () => {
        it("sprouts on an empty tile when the recipe holds", () => {
            const state = ripe(farm(), "wheat", [MID - 1, MID + 1]);
            const result = tickFarm(state, under("heatwave", sure()));
            assert.equal(result.state.tiles[MID]!.crop?.cropId, "emberwheat");
            assert.ok(result.log.some((line) => line.includes("Emberwheat")));
        });

        it("doesn't sprout without the weather, or with too few parents", () => {
            const wrongSky = ripe(farm(), "wheat", [MID - 1, MID + 1]);
            assert.equal(tickFarm(wrongSky, under("clear", sure())).state.tiles[MID]!.crop, null);
            const oneParent = ripe(farm(), "wheat", [MID - 1]);
            assert.ok(tickFarm(oneParent, under("heatwave", sure())).state.tiles.every((tile) => tile.crop?.cropId !== "emberwheat"));
        });

        it("can need a pest nearby", () => {
            let state = ripe(farm(), "pumpkin", [MID - 1]);
            assert.ok(tickFarm(state, sure()).state.tiles.every((tile) => tile.crop?.cropId !== "grinning-gourd"));
            state = withPest(state, "field-mouse", MID + 1);
            state.pests[0]!.intent = { kind: "move", tile: MID + 1 };
            assert.equal(tickFarm(state, sure()).state.tiles[MID]!.crop?.cropId, "grinning-gourd");
        });

        it("Hand Pollinate boosts the odds on its tile for one turn", () => {
            let state = { ...ripe(farm(), "wheat", [MID - 1, MID + 1]), labor: 3 };
            // 0.5 × pollinateBoost 2 = certain.
            state = stepFarm(state, { type: "play", inventoryId: card("farm.hand-pollinate"), tile: MID }, sure(0.5)).state;
            assert.equal(state.tiles[MID]!.pollinated, true);
            const after = tickFarm(state, under("heatwave", sure(0.5))).state;
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

        it("places from the inventory onto an empty tile, and picks back up", () => {
            const placed = stepFarm(farm(), { type: "place", tile: MID, itemId: "structure.pond" }, ctx);
            assert.equal(placed.state.tiles[MID]!.structure?.structureId, "pond");
            assert.deepEqual(placed.itemsUsed, [{ itemId: "structure.pond", quantity: 1 }]);
            assert.throws(() => stepFarm(placed.state, { type: "plant", tile: MID, itemId: "wheat-seeds" }, ctx), FarmRuleError);
            assert.throws(() => stepFarm(plant(farm(), MID), { type: "place", tile: MID, itemId: "structure.pond" }, ctx), FarmRuleError);
            assert.throws(() => stepFarm(farm(), { type: "place", tile: MID, itemId: "structure.pond" }, { ...ctx, held: {} }), FarmRuleError);
            const picked = stepFarm(placed.state, { type: "pickup", tile: MID }, ctx);
            assert.equal(picked.state.tiles[MID]!.structure, null);
            assert.deepEqual(picked.gains, [{ itemId: "structure.pond", quantity: 1 }]);
        });

        it("a Pond keeps the tiles beside it wet, and its frog eats a pest", () => {
            let state = place(farm(), "pond", MID);
            state = withPest(state, "earthworm", MID + 1);
            const after = tickFarm(state, ctx);
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
            assert.equal(tickFarm(state, sure()).state.tiles[MID]!.crop?.cropId, "grinning-gourd");
            const released = stepFarm(state, { type: "release", tile: MID + 1 }, ctx);
            assert.equal(released.state.tiles[MID + 1]!.structure!.caged, null);
            assert.ok(released.gains.some((gain) => gain.itemId === "mouse-tail"));
        });

        it("the Pesthunter takes a caged pest for points, spent in its shop", () => {
            let state = { ...place(farm(), "pest-cage", MID + 1), labor: 3 };
            state = withPest(state, "field-mouse", MID);
            state = stepFarm(state, { type: "cage", tile: MID }, ctx).state;
            const turnedIn = stepFarm(state, { type: "turn-in", tile: MID + 1 }, ctx);
            assert.equal(turnedIn.state.tiles[MID + 1]!.structure!.caged, null);
            assert.equal(turnedIn.state.pesthunterPoints, CONTENT.pests["field-mouse"]!.bounty);
            assert.equal(turnedIn.gains.length, 0);
            assert.throws(() => stepFarm(turnedIn.state, { type: "turn-in", tile: MID + 1 }, ctx), FarmRuleError);

            const [offer] = config.pesthunter.shop;
            const bought = stepFarm(farm({ pesthunterPoints: offer!.price + 1 }), { type: "pesthunter-buy", offer: 0 }, ctx);
            assert.equal(bought.state.pesthunterPoints, 1);
            assert.deepEqual(bought.gains, [{ itemId: offer!.itemId, quantity: 1 }]);
            assert.throws(() => stepFarm(farm(), { type: "pesthunter-buy", offer: 0 }, ctx), FarmRuleError);
            assert.throws(() => stepFarm(farm({ pesthunterPoints: 999 }), { type: "pesthunter-buy", offer: 999 }, ctx), FarmRuleError);
        });

        it("a Beehive boosts mutation odds around it", () => {
            // 0.5 × hive 1.5 isn't certain, but 0.7 × 1.5 is.
            const state = place(ripe(farm(), "wheat", [MID - 1, MID + 1]), "beehive", MID + GEO_FARM_SIZE);
            const noSwarm = { ...sure(0.7), structures: { ...CONTENT.structures, beehive: { ...CONTENT.structures.beehive!, effect: { kind: "beehive" as const, boost: 1.5, swarmChance: 0 } } } };
            assert.equal(tickFarm(state, under("heatwave", noSwarm)).state.tiles[MID]!.crop?.cropId, "emberwheat");
        });

        it("a Jukebox's tune decides which pest comes", () => {
            const eager = { ...ctx, config: { ...config, pests: { fromTurn: 0, chancePerCrop: 1, maxChance: 1, max: 4 } } };
            let state = { ...place(plant(plant(farm(), MID - 1), MID + 1, "melon-seeds"), "jukebox", MID), labor: 3 };
            state = stepFarm(state, { type: "tune", tile: MID, pestId: "earthworm" }, eager).state;
            const boosted = { ...eager, structures: { ...CONTENT.structures, jukebox: { ...CONTENT.structures.jukebox!, effect: { kind: "jukebox" as const, boost: 1e9 } } } };
            for (let seed = 1; seed <= 5; seed++) {
                const after = tickFarm({ ...state, seed }, boosted).state;
                assert.equal(after.pests[0]?.pestId, "earthworm");
            }
        });
    });

    describe("weather", () => {
        const growing = (cropId = "wheat", stage = 1) => ({
            ...farm(),
            tiles: farm().tiles.map((tile, i) =>
                i === MID ? { ...tile, moisture: 3, crop: { cropId, stage, ripeTurns: 0, held: false, rotten: false } } : tile,
            ),
        });

        it("each turn plays the weather of the period it came over, and the forecast is the periods ahead", () => {
            const period = config.turnHours * HOUR;
            const lookup = (start: number): GeoFarmWeather => (start === NOW.getTime() ? "rain" : start === NOW.getTime() + period ? "overcast" : "clear");
            assert.deepEqual(forecast({ ...farm(), skyRead: true }, config, lookup), ["rain", "overcast", "clear"]);
            const played = catchUp(farm(), { ...ctx, weather: lookup, now: new Date(NOW.getTime() + period * 2.5) });
            assert.match(played.log[1]!, /Cycle 1: Rain/);
            assert.ok(played.log.some((line) => /Cycle 2: Overcast/.test(line)));
        });

        it("a storm waters like rain and can flatten crops in the open", () => {
            const stormy = { ...ctx, config: { ...config, weather: { ...config.weather, stormFlattenChance: 1 } } };
            const after = tickFarm(growing(), under("storm", stormy));
            assert.equal(after.state.tiles[MID]!.crop, null);
            assert.ok(after.log.some((line) => line.includes("flattened")));
        });

        it("a frost stops growth, and kills young crops in the open", () => {
            const young = tickFarm(growing("wheat", 1), under("frost")).state;
            assert.equal(young.tiles[MID]!.crop, null);
            const older = tickFarm(growing("melon", 3), under("frost")).state;
            assert.equal(older.tiles[MID]!.crop!.stage, 3);
        });

        it("a Greenhouse shelters the tiles around it from the weather", () => {
            const state = stepFarm(growing("wheat", 1), { type: "place", tile: MID + 1, itemId: "structure.greenhouse" }, ctx).state;
            const after = tickFarm(state, under("frost")).state;
            assert.equal(after.tiles[MID]!.crop!.stage, 2, "grew as on a clear day");
        });
    });

    describe("events", () => {
        /** Only `eventId` exists, and one is telegraphed every turn. */
        const only = (eventId: string): FarmContext => ({
            ...ctx,
            events: { [eventId]: CONTENT.farmEvents[eventId]! },
            config: { ...config, events: { fromTurn: 0, chance: 1 } },
        });

        it("telegraphs an event for the next turn, then runs it", () => {
            const first = tickFarm(farm(), only("bumper-harvest"));
            assert.equal(first.state.nextEvent, "bumper-harvest");
            assert.ok(first.log.some((line) => line.includes("Coming next cycle")));
            const second = tickFarm(first.state, only("bumper-harvest")).state;
            assert.equal(second.activeEvent?.eventId, "bumper-harvest");
        });

        it("Bumper Harvest adds yield for the turn", () => {
            const ripeWheat = ripe(farm(), "wheat", [MID]);
            const plainYield = stepFarm(ripeWheat, { type: "harvest", tile: MID }, ctx).gains.find((gain) => gain.itemId === "wheat")!.quantity;
            const bumper = { ...ripeWheat, activeEvent: { eventId: "bumper-harvest", offers: [] } };
            const bumperYield = stepFarm(bumper, { type: "harvest", tile: MID }, ctx).gains.find((gain) => gain.itemId === "wheat")!.quantity;
            assert.equal(bumperYield, plainYield + 1);
        });

        it("a Pest Swarm brings extra pests, past the cap", () => {
            const state = { ...plant(farm(), MID), nextEvent: "pest-swarm" };
            const after = tickFarm(state, ctx).state;
            assert.equal(after.pests.length, 2);
        });

        it("a Blood Moon lets Bloodmelon sprout", () => {
            const melons = { ...ripe(farm(), "melon", [MID - 1, MID + 1]), tiles: ripe(farm(), "melon", [MID - 1, MID + 1]).tiles.map((tile, i) => (i === MID ? { ...tile, fertility: 8 } : tile)) };
            const sure = { ...ctx, mutations: { bloodmelon: { ...CONTENT.mutations.bloodmelon!, chance: 1 } } };
            assert.equal(tickFarm(melons, sure).state.tiles[MID]!.crop, null);
            assert.equal(tickFarm({ ...melons, nextEvent: "blood-moon" }, sure).state.tiles[MID]!.crop?.cropId, "bloodmelon");
        });

        it("the Travelling Merchant sells each offer once", () => {
            const state = tickFarm({ ...farm(), nextEvent: "travelling-merchant" }, ctx).state;
            const offers = state.activeEvent!.offers;
            assert.equal(offers.length, 2);
            const bought = stepFarm(state, { type: "buy", offer: 0 }, ctx);
            assert.equal(bought.coins, offers[0]!.price);
            assert.deepEqual(bought.gains, [{ itemId: offers[0]!.itemId, quantity: 1 }]);
            assert.throws(() => stepFarm(bought.state, { type: "buy", offer: 0 }, ctx), FarmRuleError);
        });
    });

    describe("orders", () => {
        const price = (itemId: string) => CONTENT.items[itemId]?.sellValue ?? 1;
        const board = () => refreshOrders(farm(), config, CONTENT.crops, price, NOW);

        it("posts the week's orders, and keeps them until the week ends", () => {
            const state = board();
            assert.equal(state.orders!.list.length, config.orders.perWeek);
            assert.equal(state.orders!.week, weekOf(NOW));
            assert.equal(refreshOrders(state, config, CONTENT.crops, price, new Date(NOW.getTime() + HOUR)), state);
            const nextWeek = refreshOrders(state, config, CONTENT.crops, price, new Date(NOW.getTime() + 7 * 24 * HOUR));
            assert.notEqual(nextWeek.orders!.week, state.orders!.week);
        });

        it("takes a deposit to accept, and pays reward and deposit on delivery", () => {
            const state = board();
            const order = state.orders!.list[0]!;
            const accepted = stepFarm(state, { type: "accept-order", orderId: order.id }, ctx);
            assert.equal(accepted.coins, order.deposit);
            const partial = stepFarm(accepted.state, { type: "deliver-order", orderId: order.id }, { ...ctx, held: { [order.itemId]: order.quantity - 1 } });
            assert.equal(partial.coinsGained, 0);
            const done = stepFarm(partial.state, { type: "deliver-order", orderId: order.id }, { ...ctx, held: { [order.itemId]: 5 } });
            assert.deepEqual(done.itemsUsed, [{ itemId: order.itemId, quantity: 1 }]);
            assert.equal(done.coinsGained, order.reward + order.deposit);
            assert.equal(done.state.orders!.list[0]!.status, "done");
            assert.throws(() => stepFarm(state, { type: "deliver-order", orderId: order.id }, ctx), FarmRuleError);
        });
    });

    describe("global events and contests", () => {
        it("picks the same global event for a week every time, in its last days", () => {
            const week = weekOf(NOW);
            const global = globalEventFor(week, config)!;
            assert.deepEqual(globalEventFor(week, config), global);
            assert.equal(global.endsAt.getTime(), weekEndsAt(week).getTime());
            const days = config.globalEvents.find((entry) => entry.eventId === global.eventId)!.days;
            assert.equal(global.endsAt.getTime() - global.startsAt.getTime(), days * 24 * HOUR);
            assert.equal(activeGlobalEvent(new Date(global.startsAt.getTime() - HOUR), config, CONTENT.farmEvents), undefined);
            assert.equal(activeGlobalEvent(global.startsAt, config, CONTENT.farmEvents)?.id, global.eventId);
        });

        it("a global Blood Moon lets Bloodmelon sprout on any farm", () => {
            const melons = ripe(farm(), "melon", [MID - 1, MID + 1]);
            const rich = { ...melons, tiles: melons.tiles.map((tile, i) => (i === MID ? { ...tile, fertility: 8 } : tile)) };
            const sure = { ...ctx, mutations: { bloodmelon: { ...CONTENT.mutations.bloodmelon!, chance: 1 } }, globalEvent: CONTENT.farmEvents["blood-moon"] };
            assert.equal(tickFarm(rich, sure).state.tiles[MID]!.crop?.cropId, "bloodmelon");
        });

        it("a Meteor Shower drops Stardust on empty tiles", () => {
            const meteor = { ...CONTENT.farmEvents["meteor-shower"]!, effect: { kind: "meteor-shower" as const, mutationBoost: 2, dropChance: 1, itemId: "stardust" } };
            const after = tickFarm(farm(), { ...ctx, globalEvent: meteor });
            assert.deepEqual(after.gains, [{ itemId: "stardust", quantity: config.startSize ** 2 }]);
        });

        it("records each harvest for the contests, mutations marked", () => {
            const result = stepFarm(ripe(farm(), "wheat", [MID]), { type: "harvest", tile: MID }, ctx);
            assert.deepEqual(result.harvested.map(({ cropId, mutation }) => ({ cropId, mutation })), [{ cropId: "wheat", mutation: false }]);
        });

        it("rotates the crop contest through every plain crop", () => {
            const ids = Object.keys(CONTENT.crops);
            const seen = new Set(Array.from({ length: ids.length }, (_, i) => contestCropFor(100 + i, CONTENT.crops)));
            assert.equal(seen.size, ids.length);
        });
    });

    describe("gambles", () => {
        const withConfig = (patch: Partial<typeof config>): FarmContext => ({ ...ctx, config: { ...config, ...patch } });
        const wasteAt = (state: FarmState, tiles: number[]): FarmState => ({
            ...state,
            tiles: state.tiles.map((tile, i) => (tiles.includes(i) ? { ...tile, waste: true, crop: null } : tile)),
        });
        const calmWaste = { ...config.waste, spreadChance: 0, pestChance: 0 };

        it("an elite pest takes several hits; frogs and cages won't take it", () => {
            let state = { ...withPest(farm(), "shade-rat", MID), labor: 3 };
            assert.equal(state.pests[0]!.hp, 3);
            state = stepFarm(state, { type: "swat", tile: MID }, ctx).state;
            assert.equal(state.pests[0]!.hp, 2);
            assert.throws(() => stepFarm({ ...place(state, "pest-cage", MID + 1), labor: 3 }, { type: "cage", tile: MID }, ctx), FarmRuleError);
            const withPond = place(state, "pond", MID + 1);
            withPond.pests[0]!.intent = { kind: "move", tile: MID };
            assert.equal(tickFarm(withPond, ctx).state.pests.length, 1);
        });

        it("a Reactor speeds crops near it, and leaks waste that kills", () => {
            const reactor = (wasteChance: number): FarmContext => ({
                ...withConfig({ waste: calmWaste }),
                structures: {
                    ...CONTENT.structures,
                    "nuclear-reactor": { ...CONTENT.structures["nuclear-reactor"]!, effect: { kind: "reactor", radius: 2, growth: 1, wasteChance } },
                },
            });
            const state = { ...farm(), tiles: plant(place(farm(), "nuclear-reactor", MID), MID + 1).tiles.map((tile) => (tile.owned ? { ...tile, moisture: 3 } : tile)) };
            assert.equal(tickFarm(state, under("clear", reactor(0))).state.tiles[MID + 1]!.crop!.stage, 2, "1 stage + 1 extra");
            const leaked = tickFarm(state, under("clear", reactor(1))).state;
            assert.equal(leaked.tiles.filter((tile) => tile.waste).length, 1);
        });

        it("waste blocks planting, is scrubbed by hand or card, and boosts mutations beside it", () => {
            let state = { ...wasteAt(farm(), [MID]), labor: 3 };
            assert.throws(() => stepFarm(state, { type: "plant", tile: MID, itemId: "wheat-seeds" }, ctx), FarmRuleError);
            assert.equal(stepFarm(state, { type: "scrub", tile: MID }, ctx).state.tiles[MID]!.waste, false);
            assert.equal(stepFarm(state, { type: "play", inventoryId: card("farm.hazmat-scrub"), tile: MID }, ctx).state.labor, 2);
            // Emberwheat at 0.4 × waste 3 is certain beside waste, not without it.
            state = ripe(farm(), "wheat", [MID - 1, MID + 1]);
            const mutations = { ...under("heatwave"), config: { ...config, waste: calmWaste }, mutations: { emberwheat: { ...CONTENT.mutations.emberwheat!, chance: 0.4 } } };
            const beside = wasteAt(state, [MID + GEO_FARM_SIZE]);
            assert.equal(tickFarm(beside, mutations).state.tiles[MID]!.crop?.cropId, "emberwheat");
        });

        it("waste spreads, and glowing pests crawl out", () => {
            const wild = withConfig({ waste: { ...config.waste, spreadChance: 1, pestChance: 1 }, pests: { ...config.pests, max: 4 } });
            const after = tickFarm(wasteAt(farm(), [MID]), wild).state;
            assert.equal(after.tiles.filter((tile) => tile.waste).length, 2);
            assert.ok(after.pests.some((pest) => pest.pestId === config.waste.pest));
        });

        it("Controlled Leak puts waste on the 4 tiles beside, killing crops", () => {
            const state = { ...plant(farm(), MID + 1), labor: 3 };
            const after = stepFarm(state, { type: "play", inventoryId: card("farm.controlled-leak"), tile: MID }, ctx).state;
            assert.deepEqual(
                [MID - 1, MID + 1, MID - GEO_FARM_SIZE, MID + GEO_FARM_SIZE].map((i) => after.tiles[i]!.waste),
                [true, true, true, true],
            );
            assert.equal(after.tiles[MID]!.waste, false);
            assert.equal(after.tiles[MID + 1]!.crop, null);
        });

        it("Tear the Veil opens a Portal: elite pests come through on its turn, then it shuts", () => {
            let state = { ...place(farm(), "portal", MID), labor: 3 };
            assert.throws(() => stepFarm(state, { type: "play", inventoryId: card("farm.tear-the-veil"), tile: MID + 1 }, ctx), FarmRuleError);
            state = stepFarm(state, { type: "play", inventoryId: card("farm.tear-the-veil"), tile: MID }, ctx).state;
            assert.equal(state.tiles[MID]!.structure!.open, true);
            const after = tickFarm(state, ctx).state;
            assert.equal(after.pests.length, 2);
            assert.ok(after.pests.every((pest) => (pest.hp ?? 1) > 1));
            assert.equal(after.tiles[MID]!.structure!.open, false);
        });

        it("the Shrine turns offerings into blessings, or curses", () => {
            const state = place(farm(), "mysterious-shrine", MID);
            const kind = withConfig({ shrine: { ...config.shrine, halfValue: 1e-9, blessings: config.shrine.blessings.map((b) => ({ ...b, weight: b.id === "plenty" || b.curse ? 1 : 0 })) } });
            const held = { ...kind, held: { wheat: 10 } };
            const blessed = stepFarm(state, { type: "offer", tile: MID, itemId: "wheat", quantity: 10 }, held);
            assert.deepEqual(blessed.itemsUsed, [{ itemId: "wheat", quantity: 10 }]);
            assert.deepEqual(blessed.state.blessings, [{ id: "plenty", turnsLeft: 3 }]);
            const ripeWheat = ripe(blessed.state, "wheat", [MID + 1]);
            const plainYield = stepFarm(ripe(state, "wheat", [MID + 1]), { type: "harvest", tile: MID + 1 }, ctx).gains[0]!.quantity;
            assert.equal(stepFarm(ripeWheat, { type: "harvest", tile: MID + 1 }, ctx).gains[0]!.quantity, plainYield + 1);

            const cruel = { ...withConfig({ shrine: { ...config.shrine, halfValue: 1e12, curseShare: 1 } }), held: { wheat: 1 } };
            const cursed = stepFarm(state, { type: "offer", tile: MID, itemId: "wheat", quantity: 1 }, cruel).state;
            assert.deepEqual(cursed.blessings.map((b) => b.id), ["pests"]);
            assert.throws(() => stepFarm(state, { type: "offer", tile: MID, itemId: "wheat", quantity: 5 }, cruel), FarmRuleError);
        });
    });

    describe("Well and Lightning Rod", () => {
        it("a Well fills with rain, and waters for no Labor while it has water", () => {
            let state = place(farm(), "well", MID);
            state = tickFarm(state, under("rain")).state;
            assert.equal(state.tiles[MID]!.structure!.water, 3);
            state = { ...state, tiles: state.tiles.map((tile, i) => (i === MID + 1 ? { ...tile, moisture: 0 } : tile)), labor: 3 };
            const watered = stepFarm(state, { type: "water", tile: MID + 1 }, ctx).state;
            assert.equal(watered.labor, 3);
            assert.equal(watered.tiles[MID]!.structure!.water, 2);
        });

        it("a Lightning Rod keeps storms from flattening the crops around it", () => {
            const stormy = { ...ctx, config: { ...config, weather: { ...config.weather, stormFlattenChance: 1 } } };
            const state = plant(place(farm(), "lightning-rod", MID), MID + 1);
            assert.ok(tickFarm(state, under("storm", stormy)).state.tiles[MID + 1]!.crop);
        });

        it("Stormcorn sprouts by ripe corn and a Lightning Rod in a storm", () => {
            const sure = { ...ctx, mutations: { stormcorn: { ...CONTENT.mutations.stormcorn!, chance: 1 } } };
            const state = place(ripe(farm(), "corn", [MID - 1]), "lightning-rod", MID + 1);
            assert.equal(tickFarm(state, under("storm", sure)).state.tiles[MID]!.crop?.cropId, "stormcorn");
            const noRod = ripe(farm(), "corn", [MID - 1]);
            assert.equal(tickFarm(noRod, under("storm", sure)).state.tiles[MID]!.crop, null);
        });
    });

    describe("soil", () => {
        const soiled = (state: FarmState, soil: FarmState["tiles"][number]["soil"], tiles: number[]): FarmState => ({
            ...state,
            tiles: state.tiles.map((tile, i) => (tiles.includes(i) ? { ...tile, soil } : tile)),
        });

        it("an amendment changes a tile's soil for good, from the inventory", () => {
            const result = stepFarm(farm(), { type: "amend", tile: MID, itemId: "bone-meal-blend" }, { ...ctx, held: { "bone-meal-blend": 1 } });
            assert.equal(result.state.tiles[MID]!.soil, "rich");
            assert.deepEqual(result.itemsUsed, [{ itemId: "bone-meal-blend", quantity: 1 }]);
            assert.throws(() => stepFarm(farm(), { type: "amend", tile: MID, itemId: "bone-meal-blend" }, ctx), FarmRuleError);
            assert.throws(() => stepFarm(farm(), { type: "amend", tile: MID, itemId: "wheat" }, { ...ctx, held: { wheat: 1 } }), FarmRuleError);
        });

        it("Rich soil rests higher and faster", () => {
            const state = soiled(farm(), "rich", [MID]);
            const tired = { ...state, tiles: state.tiles.map((tile, i) => (i === MID ? { ...tile, fertility: 5 } : tile)) };
            assert.equal(tickFarm(tired, under("clear")).state.tiles[MID]!.fertility, 5 + config.soil.richRecovery);
        });

        it("Boggy soil never dries out", () => {
            const state = soiled(farm(), "boggy", [MID]);
            assert.equal(tickFarm(state, under("heatwave")).state.tiles[MID]!.moisture, 1);
        });

        it("Cursed soil costs plain crops a yield", () => {
            const normal = stepFarm(ripe(farm(), "wheat", [MID]), { type: "harvest", tile: MID }, ctx).gains[0]!.quantity;
            const cursed = stepFarm(soiled(ripe(farm(), "wheat", [MID]), "cursed", [MID]), { type: "harvest", tile: MID }, ctx).gains[0]!.quantity;
            assert.equal(cursed, Math.max(1, normal + config.soil.cursedYield));
        });

        it("Hex the Earth curses a tile for one turn: enough for Hexroot", () => {
            const sure = { ...ctx, mutations: { hexroot: { ...CONTENT.mutations.hexroot!, chance: 1 } } };
            let state = { ...ripe(farm(), "potato", [MID - 1, MID + 1]), labor: 3 };
            state = stepFarm(state, { type: "play", inventoryId: card("farm.hex-the-earth"), tile: MID }, sure).state;
            assert.equal(state.tiles[MID]!.soilOverlay?.soil, "cursed");
            const after = tickFarm(state, sure).state;
            assert.equal(after.tiles[MID]!.crop?.cropId, "hexroot");
            assert.equal(after.tiles[MID]!.soilOverlay, null);
        });

        it("Mulch makes a row Boggy for two turns", () => {
            let state = stepFarm({ ...farm(), labor: 3 }, { type: "play", inventoryId: card("farm.mulch"), tile: MID }, ctx).state;
            assert.equal(state.tiles[MID - 1]!.soilOverlay?.soil, "boggy");
            state = advanceWet(state, 1);
            assert.equal(state.tiles[MID]!.soilOverlay?.turnsLeft, 1);
            state = advanceWet(state, 1);
            assert.equal(state.tiles[MID]!.soilOverlay, null);
        });

        it("the Shrine leaves Cursed Ash when it keeps an offering", () => {
            const state = place(farm(), "mysterious-shrine", MID);
            const stingy = { ...ctx, config: { ...config, shrine: { ...config.shrine, halfValue: 1e12, curseShare: 0 } }, held: { wheat: 1 } };
            assert.deepEqual(stepFarm(state, { type: "offer", tile: MID, itemId: "wheat", quantity: 1 }, stingy).gains, [{ itemId: "cursed-ash", quantity: 1 }]);
        });
    });

    describe("more cards", () => {
        const play = (state: FarmState, cardId: string, tile = MID, context = ctx) =>
            stepFarm({ ...state, labor: 3 }, { type: "play", inventoryId: card(cardId), tile }, context);

        it("Coax rolls the recipes that hold now; a miss tires the soil", () => {
            const wheat = ripe(farm(), "wheat", [MID - 1, MID + 1]);
            const sure = { ...under("heatwave"), mutations: { emberwheat: { ...CONTENT.mutations.emberwheat!, chance: 1 } } };
            // Chance 1 at half share is 50%: find a seed each way.
            const outcome = (seed: number) => play({ ...wheat, seed }, "farm.coax", MID, sure).state.tiles[MID]!;
            const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
            assert.ok(seeds.some((seed) => outcome(seed).crop?.cropId === "emberwheat"));
            assert.ok(seeds.some((seed) => !outcome(seed).crop && outcome(seed).fertility === config.startFertility - 2));
        });

        it("Compost Spread feeds a cross from a Compost Bin's compost", () => {
            const state = place(farm(), "compost-bin", MID + GEO_FARM_SIZE + 1);
            assert.throws(() => play(state, "farm.compost-spread"), FarmRuleError);
            const stocked = { ...state, tiles: state.tiles.map((tile) => (tile.structure ? { ...tile, structure: { ...tile.structure, compost: 3 } } : tile)) };
            const after = play(stocked, "farm.compost-spread").state;
            assert.equal(after.tiles[MID]!.fertility, config.startFertility + 2);
            assert.equal(after.tiles[MID - 1]!.fertility, config.startFertility + 2);
            assert.equal(after.tiles[MID + GEO_FARM_SIZE + 1]!.structure!.compost, 1);
        });

        it("Lime Dust holds fertility through the next turn, and stops growth", () => {
            let state = withPest(plant(farm(), MID), "earthworm", MID);
            state = play(state, "farm.lime-dust").state;
            const after = advanceWet(state, 1);
            assert.equal(after.tiles[MID]!.fertility, config.startFertility);
            assert.equal(after.tiles[MID]!.crop!.stage, 0);
            assert.equal(after.tiles[MID]!.limed, false);
        });

        it("Moon Rite brings a Blood Moon next", () => {
            assert.equal(play(farm(), "farm.moon-rite").state.nextEvent, "blood-moon");
        });

        it("Exterminator's Oath doubles the next 3 pests' drops", () => {
            const sworn = play(withPest(farm(), "field-mouse", MID), "farm.exterminators-oath").state;
            assert.equal(sworn.oath, 3);
            const swatted = stepFarm({ ...sworn, labor: 3 }, { type: "swat", tile: MID }, ctx);
            assert.equal(swatted.state.oath, 2);
            const tails = swatted.gains.find((gain) => gain.itemId === "mouse-tail")!.quantity;
            assert.ok(tails >= 2, "two rolls of 1–2 tails");
        });

        it("Rush Order counts one crop more on the next delivery", () => {
            const price = (itemId: string) => CONTENT.items[itemId]?.sellValue ?? 1;
            let state = refreshOrders(farm(), config, CONTENT.crops, price, NOW);
            const order = state.orders!.list[0]!;
            state = stepFarm(state, { type: "accept-order", orderId: order.id }, ctx).state;
            state = play(state, "farm.rush-order").state;
            const delivered = stepFarm(state, { type: "deliver-order", orderId: order.id }, { ...ctx, held: { [order.itemId]: order.quantity } });
            assert.deepEqual(delivered.itemsUsed, [{ itemId: order.itemId, quantity: order.quantity - 1 }]);
            assert.equal(delivered.state.orders!.list[0]!.status, "done");
        });

        it("Chain Reaction turns waste into mutations, or Glow Beetles", () => {
            const state = { ...farm(), tiles: farm().tiles.map((tile, i) => (i === MID || i === MID + 1 ? { ...tile, waste: true } : tile)) };
            const after = play(state, "farm.chain-reaction").state;
            for (const i of [MID, MID + 1]) {
                const tile = after.tiles[i]!;
                assert.ok((!tile.waste && tile.crop) || after.pests.some((pest) => pest.tile === i));
            }
        });
    });
});
