import type { GeoFarmAction, GeoFarmGain, GeoFarmOrder, GeoFarmPestIntent, GeoFarmSoil, GeoFarmWeather } from "@cozy/shared/geo";
import { GEO_FARM_MAX_FERTILITY, GEO_FARM_MAX_MOISTURE, GEO_FARM_SIZE, GEO_FARM_WEATHERS } from "@cozy/shared/geo";
import {
    FARMING_CARDS,
    isFarmingCardId,
    type CropDef,
    type FarmEventDef,
    type FarmingCardId,
    type GrowsDef,
    type MutationDef,
    type PestDef,
    type StructureDef,
} from "../content/farming";
import type { FarmingConfig } from "../content/models";
import { createRng, type Rng } from "../engine/rng";
import { regionKey, toRegion, type WeatherLookup } from "./weather";

/**
 * The farming rules: pure and seeded, like fishing and combat. Each step
 * takes the stored farm and returns the next, plus what the repository must
 * save alongside it in the same transaction (a seed out of the bag, a card's
 * charge, the harvest, coins for a tile).
 *
 * Nothing grows on the clock: the clock only banks Farm Turns (`accrue`),
 * and the farm moves when the player spends one on Advance. Each banked turn
 * keeps the weather of the 12 hours it came in over (real, from the farm's
 * home region, via a `WeatherLookup`), and plays it on its Advance.
 *
 * Pests are pieces on the grid. Each carries the move it will make on the
 * next Advance (planned when it arrives, and again after every Advance), so
 * the player sees it coming. Advance runs: pests act, weather and growth,
 * mutations may sprout, new pests arrive, every pest plans its next move.
 *
 * Structures stand on a tile instead of a crop and change the farm around
 * them: a Pond's frog eats a pest before pests act, Beehives may swarm,
 * Compost Bins feed the soil after growth, Beehives and caged pests help
 * mutations, a Jukebox's tune picks which pest comes.
 *
 * Farm events are telegraphed an Advance ahead (`nextEvent`). Some act on
 * their Advance (a pest swarm, a fairy ring, a blood moon); some last the
 * turn after it (`activeEvent`: a bumper harvest, a travelling merchant).
 * The weekly Order Board (`orders`) is refreshed by `refreshOrders`.
 *
 * The gambles: a Nuclear Reactor speeds crops near it but leaks waste that
 * spreads and kills, while stirring up mutations and glowing pests; a Portal
 * brings elite pests (several hits each) with rich drops; the Mysterious
 * Shrine turns offerings into a roll for a blessing, or a curse.
 *
 * Mutations sprout on empty tiles whose surroundings meet a secret recipe
 * (ripe parents around, maybe a weather, a pest, rich soil). They grow and
 * harvest like crops, without seeds.
 *
 * PLACEHOLDER: card rules are a switch on card id, as in fishing, until the
 * farm has engine effects (shapes, timings, keywords) of its own.
 */

export class FarmRuleError extends Error {}

export type FarmCrop = {
    cropId: string;
    stage: number;
    ripeTurns: number;
    held: boolean;
    rotten: boolean;
};

export type FarmTile = {
    owned: boolean;
    crop: FarmCrop | null;
    moisture: number;
    soakTurns: number;
    fertility: number;
    blueprint: string | null;
    /** Snap Trap: catches a pest moving onto it on the next Advance. */
    trap: boolean;
    /** Hand Pollinate: mutation odds here are boosted on the next Advance. */
    pollinated: boolean;
    /** A structure standing here instead of a crop. */
    structure: FarmStructure | null;
    /** Nuclear waste: nothing grows or is built here until it's scrubbed. */
    waste: boolean;
    /** The tile's own soil; only an amendment changes it. */
    soil: GeoFarmSoil;
    /** A card's soil over it for `turnsLeft` more Advances, counting instead of `soil`. */
    soilOverlay: { soil: GeoFarmSoil; turnsLeft: number } | null;
    /** Lime Dust: its fertility can't drop until the next Advance is done, and its crop won't grow on it. */
    limed: boolean;
};

/** The soil that counts on a tile now: a card's overlay, else its own. */
export const soilOf = (tile: FarmTile): GeoFarmSoil => tile.soilOverlay?.soil ?? tile.soil;

export type FarmStructure = {
    structureId: string;
    /** Jukebox: the pest whose tune plays. */
    tune: string | null;
    /** Pest Cage: the pest kept inside. */
    caged: string | null;
    /** Compost Bin: compost waiting. */
    compost: number;
    /** Portal: torn open for the next Advance. */
    open: boolean;
    /** Well: water stored. */
    water: number;
};

export type FarmPest = {
    id: number;
    pestId: string;
    tile: number;
    /** Advances it has lived through. */
    age: number;
    /** What it does on the next Advance. */
    intent: GeoFarmPestIntent;
    /** Hits left; missing on pests saved before elites (1). */
    hp?: number;
};

/** Everything a farm keeps, in `geo.farms.state`. */
export type FarmState = {
    version: 11;
    /** Rolls for harvests and rot; replaced after every step so it never has to fast-forward. */
    seed: number;
    /** Fixed for the farm's life: the weather of turn n is the same whenever it's asked. */
    weatherSeed: number;
    /** GEO_FARM_SIZE², row by row. */
    tiles: FarmTile[];
    /** Advances so far. */
    turn: number;
    labor: number;
    turnsBanked: number;
    /** When the turn now coming in started counting (ISO). */
    accruedAt: string;
    /** The weather each banked turn will play, oldest first; seeded rolls fill any gap. */
    turnWeather: GeoFarmWeather[];
    /** The home region the weather comes from (a coarse grid square), and when it was set (ISO). */
    home: { latitude: number; longitude: number; setAt: string } | null;
    /** Read the Sky: the long forecast shows until the next Advance. */
    skyRead: boolean;
    /** Tiles bought so far, for the next one's price. */
    unlocked: number;
    pests: FarmPest[];
    /** The next pest's id. */
    nextPestId: number;
    /** Mutations turned in at the Research Lab, first found first. */
    lab: string[];
    /** The farm event telegraphed for the next Advance. */
    nextEvent: string | null;
    /** The event on for this turn (after its Advance), with a merchant's offers. */
    activeEvent: { eventId: string; offers: { itemId: string; price: number; bought: boolean }[] } | null;
    /** This week's Order Board; `week` counts weeks since the epoch's first Monday. */
    orders: { week: number; list: GeoFarmOrder[] } | null;
    /** Shrine blessings and curses on the farm, with the Advances each has left. */
    blessings: { id: BlessingId; turnsLeft: number }[];
    /** Exterminator's Oath: how many more cleared pests roll their drops twice. */
    oath: number;
    /** Rush Order: the next order delivery counts one crop more. */
    rushOrder: boolean;
    /** Pesthunter points from caged pests turned in, not yet spent. */
    pesthunterPoints: number;
};

export type BlessingId = FarmingConfig["shrine"]["blessings"][number]["id"];

/** A farm as an older version saved it: the fields added since may be missing. */
type AddedLater =
    | "pests"
    | "nextPestId"
    | "lab"
    | "turnWeather"
    | "home"
    | "nextEvent"
    | "activeEvent"
    | "orders"
    | "blessings"
    | "oath"
    | "rushOrder"
    | "pesthunterPoints";
export type StoredFarm = Omit<FarmState, "version" | "tiles" | AddedLater> &
    Partial<Pick<FarmState, AddedLater>> & {
        version: number;
        tiles: (Omit<FarmTile, "trap" | "pollinated" | "structure" | "waste" | "soil" | "soilOverlay" | "limed"> & {
            limed?: boolean;
            soil?: GeoFarmSoil;
            soilOverlay?: FarmTile["soilOverlay"];
            trap?: boolean;
            pollinated?: boolean;
            waste?: boolean;
            structure?: (Omit<FarmStructure, "open" | "water"> & { open?: boolean; water?: number }) | null;
        })[];
    };

/**
 * A farm saved by an older version (1: before pests, 2: before mutations,
 * 3: before structures, 4: before real weather, 5: before events and
 * orders, 6: before the gamble structures, 7: before the Well, 8: before
 * soil, 9: before the second round of cards, 10: before the Pesthunter),
 * brought up to date.
 */
export function upgradeFarm(stored: StoredFarm): FarmState {
    if (stored.version === 11) return stored as FarmState;
    return {
        ...stored,
        version: 11,
        pesthunterPoints: stored.pesthunterPoints ?? 0,
        oath: stored.oath ?? 0,
        rushOrder: stored.rushOrder ?? false,
        blessings: stored.blessings ?? [],
        nextEvent: stored.nextEvent ?? null,
        activeEvent: stored.activeEvent ?? null,
        orders: stored.orders ?? null,
        // Turns banked before real weather play seeded rolls (the gap filler).
        turnWeather: stored.turnWeather ?? [],
        home: stored.home ?? null,
        tiles: stored.tiles.map((tile) => ({
            ...tile,
            trap: tile.trap ?? false,
            pollinated: tile.pollinated ?? false,
            structure: tile.structure ? { ...tile.structure, open: tile.structure.open ?? false, water: tile.structure.water ?? 0 } : null,
            waste: tile.waste ?? false,
            soil: tile.soil ?? "normal",
            soilOverlay: tile.soilOverlay ?? null,
            limed: tile.limed ?? false,
        })),
        pests: stored.pests ?? [],
        nextPestId: stored.nextPestId ?? 1,
        lab: stored.lab ?? [],
    };
}

export type FarmHandCard = { inventoryId: string; itemId: string; cardId: string; chargesLeft: number };
export type FarmSeedSlot = { slot: number; itemId: string; quantity: number };

/** What a step needs besides the farm, loaded by the repository. */
export type FarmContext = {
    crops: Record<string, CropDef>;
    mutations: Record<string, MutationDef>;
    pests: Record<string, PestDef>;
    structures: Record<string, StructureDef>;
    events: Record<string, FarmEventDef>;
    /** The server-wide event on now, if any (`activeGlobalEvent`). */
    globalEvent?: FarmEventDef;
    /** What an NPC pays for an item, for Shrine offerings. */
    sellValue: (itemId: string) => number;
    config: FarmingConfig;
    now: Date;
    hand: FarmHandCard[];
    seedBag: FarmSeedSlot[];
    /** How many of each item the player holds (structures are placed from these). */
    held: Record<string, number>;
    /** The player's farming level: sets the Labor each Advance refills to. */
    farmingLevel: number;
};

export type FarmStepResult = {
    state: FarmState;
    log: string[];
    gains: GeoFarmGain[];
    xp: number;
    /** One seed taken from this slot. */
    seedUsed: { slot: number; itemId: string; from: number } | null;
    /** One charge spent from this card. */
    cardPlayed: { inventoryId: string; chargesLeft: number } | null;
    /** Coins the step costs. */
    coins: number;
    /** Items the step takes from the inventory (a structure placed, an order delivered). */
    itemsUsed: GeoFarmGain[];
    /** Coins the step pays out (an order completed). */
    coinsGained: number;
    /** Each harvest's crop and haul, for the weekly contests. */
    harvested: { cropId: string; itemId: string; quantity: number; mutation: boolean }[];
};

/** The Labor each Advance refills to at this farming level. */
export const laborFor = (config: FarmingConfig, level: number) => config.laborPerTurn + config.laborLevels.filter((at) => level >= at).length;

/** The next farming level that adds Labor, or null past the last. */
export const nextLaborLevel = (config: FarmingConfig, level: number) => config.laborLevels.find((at) => level < at) ?? null;

const N = GEO_FARM_SIZE;
const HOUR_MS = 3_600_000;

export const tileXY = (index: number) => ({ x: index % N, y: Math.floor(index / N) });
const indexOf = (x: number, y: number) => y * N + x;
const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N;
const tileName = (index: number) => {
    const { x, y } = tileXY(index);
    return `(${x + 1}, ${y + 1})`;
};

/** Coax rolls a mutation at this share of its usual chance. */
const COAX_SHARE = 0.5;
/** Chain Reaction: each waste tile's chance of turning into a mutation. */
const CHAIN_REACTION_CHANCE = 0.3;

const newSeed = (rng: Rng) => Math.floor(rng.next() * 4_294_967_296) >>> 0;

/**
 * A new farm: a startSize square of Normal soil in the middle, everything
 * else locked. Its starting turns take the weather of the periods just past.
 */
export function newFarm(
    config: FarmingConfig,
    seed: number,
    weatherSeed: number,
    now: Date,
    lookup: WeatherLookup = seededLookup(weatherSeed, config),
): FarmState {
    const period = config.turnHours * HOUR_MS;
    const low = (N - config.startSize) / 2;
    const high = low + config.startSize;
    const tiles = Array.from({ length: N * N }, (_, index): FarmTile => {
        const { x, y } = tileXY(index);
        return {
            owned: x >= low && x < high && y >= low && y < high,
            crop: null,
            moisture: 0,
            soakTurns: 0,
            fertility: config.startFertility,
            blueprint: null,
            trap: false,
            pollinated: false,
            structure: null,
            waste: false,
            soil: "normal",
            soilOverlay: null,
            limed: false,
        };
    });
    return {
        version: 11,
        seed,
        weatherSeed,
        tiles,
        turn: 0,
        labor: config.laborPerTurn,
        turnsBanked: config.startTurnsBanked,
        accruedAt: now.toISOString(),
        turnWeather: Array.from({ length: config.startTurnsBanked }, (_, i) => lookup(now.getTime() - (config.startTurnsBanked - i) * period)),
        home: null,
        skyRead: false,
        unlocked: 0,
        pests: [],
        nextPestId: 1,
        lab: [],
        nextEvent: null,
        activeEvent: null,
        orders: null,
        blessings: [],
        oath: 0,
        rushOrder: false,
        pesthunterPoints: 0,
    };
}

/**
 * Banks the Farm Turns that came in since the last look, each with the
 * weather of the period it came in over. Pure: returns a new state.
 */
export function accrue(state: FarmState, config: FarmingConfig, now: Date, lookup: WeatherLookup = seededLookup(state.weatherSeed, config)): FarmState {
    const period = config.turnHours * HOUR_MS;
    if (state.turnsBanked >= config.maxTurnsBanked) return { ...state, accruedAt: now.toISOString() };
    const since = new Date(state.accruedAt).getTime();
    const gained = Math.floor(Math.max(0, now.getTime() - since) / period);
    if (gained === 0) return state;
    const banked = Math.min(config.maxTurnsBanked, state.turnsBanked + gained);
    const added = banked - state.turnsBanked;
    // Older saves may be short of entries: pad with the seeded rolls they would have played.
    const known = Array.from({ length: state.turnsBanked }, (_, i) => state.turnWeather[i] ?? weatherAt(state, config, state.turn + 1 + i));
    const turnWeather = [...known, ...Array.from({ length: added }, (_, i) => lookup(since + i * period))];
    // A full bank stops the clock; it starts again from the next Advance.
    const accruedAt = banked >= config.maxTurnsBanked ? now : new Date(since + gained * period);
    return { ...state, turnsBanked: banked, turnWeather, accruedAt: accruedAt.toISOString() };
}

/** When the next Farm Turn comes in, or null while the bank is full. */
export function nextTurnAt(state: FarmState, config: FarmingConfig): Date | null {
    if (state.turnsBanked >= config.maxTurnsBanked) return null;
    return new Date(new Date(state.accruedAt).getTime() + config.turnHours * HOUR_MS);
}

/** A seeded weather roll for `key`: the placeholder when there's no real weather. */
function rollWeather(weatherSeed: number, config: FarmingConfig, key: number): GeoFarmWeather {
    const roll = createRng((weatherSeed ^ Math.imul(key, 0x9e3779b1)) >>> 0).next();
    const weights = GEO_FARM_WEATHERS.map((weather) => config.weatherWeights[weather]);
    let pick = roll * weights.reduce((sum, weight) => sum + weight, 0);
    for (const [i, weather] of GEO_FARM_WEATHERS.entries()) {
        pick -= weights[i]!;
        if (pick < 0) return weather;
    }
    return "clear";
}

/** The seeded roll for turn n: fills in for a banked turn with no recorded weather. */
export const weatherAt = (state: FarmState, config: FarmingConfig, turn: number) => rollWeather(state.weatherSeed, config, turn);

/** Seeded weather by period: the lookup for a farm with no home region, or when the real weather can't answer. */
export function seededLookup(weatherSeed: number, config: FarmingConfig): WeatherLookup {
    const period = config.turnHours * HOUR_MS;
    return (periodStart) => rollWeather(weatherSeed, config, 1_000_000 + Math.floor(periodStart / period));
}

/**
 * The weather of the coming Advances: one, or three after Read the Sky.
 * Banked turns' weather is already known; past them, the forecast for the
 * periods the next turns will come in over.
 */
export function forecast(state: FarmState, config: FarmingConfig, lookup: WeatherLookup = seededLookup(state.weatherSeed, config)): GeoFarmWeather[] {
    const period = config.turnHours * HOUR_MS;
    const length = state.skyRead ? 3 : 1;
    return Array.from({ length }, (_, i) => {
        if (i < state.turnsBanked) return state.turnWeather[i] ?? weatherAt(state, config, state.turn + 1 + i);
        return lookup(new Date(state.accruedAt).getTime() + (i - state.turnsBanked) * period);
    });
}

const WEEK_MS = 7 * 24 * HOUR_MS;
/** 1970-01-05, a Monday: weeks run Monday 00:00 UTC to the next. */
const FIRST_MONDAY_MS = 4 * 24 * HOUR_MS;

export const weekOf = (now: Date) => Math.floor((now.getTime() - FIRST_MONDAY_MS) / WEEK_MS);
export const weekEndsAt = (week: number) => new Date(FIRST_MONDAY_MS + (week + 1) * WEEK_MS);

/** Week `week`'s server-wide event and when it runs: its last `days` days. Null for a week with none. */
export function globalEventFor(week: number, config: FarmingConfig): { eventId: string; startsAt: Date; endsAt: Date } | null {
    const choices = config.globalEvents.filter((entry) => entry.weight > 0);
    if (choices.length === 0) return null;
    let roll = createRng((Math.imul(week, 0x27d4eb2d) ^ 0x5bd1e995) >>> 0).next() * choices.reduce((sum, entry) => sum + entry.weight, 0);
    const chosen = choices.find((entry) => (roll -= entry.weight) < 0) ?? choices[choices.length - 1]!;
    const endsAt = weekEndsAt(week);
    return { eventId: chosen.eventId, startsAt: new Date(endsAt.getTime() - chosen.days * 24 * HOUR_MS), endsAt };
}

/** The server-wide event on at `now`, if any. */
export function activeGlobalEvent(now: Date, config: FarmingConfig, events: Record<string, FarmEventDef>): FarmEventDef | undefined {
    const global = globalEventFor(weekOf(now), config);
    return global && now >= global.startsAt && now < global.endsAt ? events[global.eventId] : undefined;
}

/** The crop week `week`'s crop contest is for: the plain crops in turn. */
export function contestCropFor(week: number, crops: Record<string, CropDef>): string | null {
    const ids = Object.keys(crops).sort();
    return ids.length > 0 ? ids[week % ids.length]! : null;
}

/**
 * This week's Order Board: kept while the week lasts, else a fresh set
 * (accepted orders left unfinished lose their deposit). `sellValue` prices
 * each crop as the NPCs pay, which sizes the orders. Pure.
 */
export function refreshOrders(
    state: FarmState,
    config: FarmingConfig,
    crops: Record<string, CropDef>,
    sellValue: (itemId: string) => number,
    now: Date,
): FarmState {
    const week = weekOf(now);
    if (state.orders?.week === week) return state;
    const rng = createRng((state.weatherSeed ^ Math.imul(week, 0x85ebca6b)) >>> 0);
    const { perWeek, value, rewardMultiplier, depositShare } = config.orders;
    const plain = Object.values(crops);
    const list = Array.from({ length: plain.length > 0 ? perWeek : 0 }, (_, i): GeoFarmOrder => {
        const crop = pick(rng, plain);
        const price = Math.max(1, sellValue(crop.produce));
        const target = between(rng, value);
        const quantity = Math.max(1, Math.round(target / price));
        const reward = Math.round(quantity * price * rewardMultiplier);
        return { id: `${week}-${i}`, itemId: crop.produce, quantity, delivered: 0, reward, deposit: Math.round(reward * depositShare), status: "offered" };
    });
    return { ...state, orders: { week, list } };
}

/** When the home region can next move, or null when it can now. */
export function homeMovableAt(state: FarmState, config: FarmingConfig, now: Date): Date | null {
    if (!state.home) return null;
    const at = new Date(new Date(state.home.setAt).getTime() + config.weather.homeCooldownDays * 24 * HOUR_MS);
    return at > now ? at : null;
}

/** Coins the next tile costs, or null when every tile is owned. */
export function unlockCost(state: FarmState, config: FarmingConfig): number | null {
    if (state.tiles.every((tile) => tile.owned)) return null;
    return config.unlockCost.first + config.unlockCost.step * state.unlocked;
}

/** Locked, but sharing an edge with an owned tile. */
export function isUnlockable(state: FarmState, index: number): boolean {
    const tile = state.tiles[index];
    if (!tile || tile.owned) return false;
    const { x, y } = tileXY(index);
    return [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
    ].some(([nx, ny]) => inGrid(nx!, ny!) && state.tiles[indexOf(nx!, ny!)]!.owned);
}

export const isRipe = (crop: FarmCrop, def: GrowsDef) => !crop.rotten && crop.stage >= def.stages;

/** Chance a crop rots on the next Advance: only ripe, unheld crops can. */
export function rotChance(crop: FarmCrop, def: GrowsDef, config: FarmingConfig): number {
    if (!isRipe(crop, def) || crop.held) return 0;
    const chances = config.rotChances;
    return chances[Math.min(crop.ripeTurns, chances.length - 1)]!;
}

/** Owned tiles up to `reach` steps from `index` (diagonals count one), not `index` itself. */
function around(state: FarmState, index: number, reach: number): number[] {
    const { x, y } = tileXY(index);
    const found: number[] = [];
    for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
            if ((dx === 0 && dy === 0) || !inGrid(x + dx, y + dy)) continue;
            const at = indexOf(x + dx, y + dy);
            if (state.tiles[at]!.owned) found.push(at);
        }
    }
    return found;
}

const pick = <T>(rng: Rng, list: T[]): T => list[Math.floor(rng.next() * list.length)]!;
const hasCrop = (state: FarmState, index: number) => Boolean(state.tiles[index]!.crop && !state.tiles[index]!.crop!.rotten);

/** A random one of `tiles`, from the ones growing a crop the pest likes if there are any. */
function pickLiked(state: FarmState, def: PestDef, tiles: number[], rng: Rng): number {
    const liked = tiles.filter((index) => def.likes.includes(state.tiles[index]!.crop?.cropId ?? ""));
    return pick(rng, liked.length > 0 ? liked : tiles);
}

/** What a pest will do on the next Advance, from where it stands now. */
export function planIntent(state: FarmState, pest: FarmPest, def: PestDef, rng: Rng): GeoFarmPestIntent {
    const here = pest.tile;
    const wander = (): GeoFarmPestIntent => {
        const steps = around(state, here, 1);
        return { kind: "move", tile: steps.length > 0 ? pick(rng, steps) : here };
    };
    const behaviour = def.behaviour;
    switch (behaviour.kind) {
        case "eat": {
            if (hasCrop(state, here)) return { kind: "eat", tile: here };
            const food = around(state, here, behaviour.reach).filter((index) => hasCrop(state, index));
            return food.length > 0 ? { kind: "eat", tile: pickLiked(state, def, food, rng) } : wander();
        }
        case "drain": {
            if (state.tiles[here]!.fertility > 0) return { kind: "drain", tile: here, amount: behaviour.amount };
            const rich = around(state, here, 1).filter((index) => state.tiles[index]!.fertility > 0);
            if (rich.length === 0) return wander();
            const best = Math.max(...rich.map((index) => state.tiles[index]!.fertility));
            return { kind: "move", tile: pick(rng, rich.filter((index) => state.tiles[index]!.fertility === best)) };
        }
        case "breed": {
            if ((pest.age + 1) % behaviour.every === 0) {
                const taken = new Set(state.pests.map((other) => other.tile));
                const spots = around(state, here, 1).filter((index) => hasCrop(state, index) && !taken.has(index));
                if (spots.length > 0) return { kind: "breed", tile: pickLiked(state, def, spots, rng) };
            }
            if (hasCrop(state, here)) return { kind: "sap", tile: here };
            const food = around(state, here, 1).filter((index) => hasCrop(state, index));
            return food.length > 0 ? { kind: "move", tile: pickLiked(state, def, food, rng) } : wander();
        }
    }
}

const between = (rng: Rng, { min, max }: { min: number; max: number }) => min + Math.floor(rng.next() * (max - min + 1));

/**
 * One step. Throws FarmRuleError for anything the player can't do now (not
 * enough Labor, no turns banked, a tile that isn't theirs…).
 */
export function stepFarm(prev: FarmState, action: GeoFarmAction, ctx: FarmContext): FarmStepResult {
    const state: FarmState = structuredClone(prev);
    const rng = createRng(state.seed);
    const result: FarmStepResult = { state, log: [], gains: [], xp: 0, seedUsed: null, cardPlayed: null, coins: 0, itemsUsed: [], coinsGained: 0, harvested: [] };
    const { config, crops } = ctx;

    const tileAt = (index: number) => {
        const tile = Number.isInteger(index) ? state.tiles[index] : undefined;
        if (!tile) throw new FarmRuleError("No such tile");
        return tile;
    };
    const ownedTile = (index: number) => {
        const tile = tileAt(index);
        if (!tile.owned) throw new FarmRuleError("That tile isn't yours yet");
        return tile;
    };
    const cropDef = (crop: FarmCrop): GrowsDef => {
        const def = crops[crop.cropId] ?? ctx.mutations[crop.cropId];
        if (!def) throw new Error(`Unknown crop "${crop.cropId}"`);
        return def;
    };
    const spendLabor = (amount: number) => {
        if (state.labor < amount) throw new FarmRuleError(`That needs ${amount} Labor; you have ${state.labor}`);
        state.labor -= amount;
    };
    const gain = (itemId: string, quantity: number) => {
        if (quantity <= 0) return;
        const existing = result.gains.find((entry) => entry.itemId === itemId);
        if (existing) existing.quantity += quantity;
        else result.gains.push({ itemId, quantity });
    };

    /** A ripe crop into the inventory: yield from the roll, the wait, the soil and `bonus`. */
    const harvest = (index: number, bonus: number) => {
        const tile = state.tiles[index]!;
        const crop = tile.crop!;
        const def = cropDef(crop);
        const fertilityBonus =
            (tile.fertility <= config.fertilityYield.low ? -1 : tile.fertility >= config.fertilityYield.high ? 1 : 0) +
            // Cursed soil spoils plain crops; mutations don't mind.
            (soilOf(tile) === "cursed" && "seed" in def ? config.soil.cursedYield : 0);
        const pushBonus = Math.min(crop.ripeTurns, config.rotChances.length);
        const event = state.activeEvent ? ctx.events[state.activeEvent.eventId] : undefined;
        const bumper = (event?.effect.kind === "bumper-harvest" ? event.effect.bonus : 0) + (blessed("plenty") ? 1 : 0);
        const amount = Math.max(1, between(rng, def.yield) + pushBonus + fertilityBonus + bonus + bumper);
        // Mutations give no seeds back.
        const seeds = "seed" in def ? between(rng, def.seedsBack) : 0;
        gain(def.produce, amount);
        if ("seed" in def) gain(def.seed, seeds);
        result.harvested.push({ cropId: def.id, itemId: def.produce, quantity: amount, mutation: !("seed" in def) });
        result.xp += def.xp;
        tile.crop = null;
        if (!tile.limed) tile.fertility = Math.max(0, tile.fertility - def.fertilityCost);
        addCompost();
        result.log.push(`Harvested ${amount} ${def.name} at ${tileName(index)}${seeds > 0 ? ` and ${seeds} seeds` : ""}.`);
    };
    const pestDef = (pest: FarmPest) => {
        const def = ctx.pests[pest.pestId];
        if (!def) throw new Error(`Unknown pest "${pest.pestId}"`);
        return def;
    };
    /** A pest off the farm, rolling its drops. */
    const clearPest = (pest: FarmPest, how: string, log = result.log) => {
        const def = pestDef(pest);
        state.pests = state.pests.filter((other) => other.id !== pest.id);
        // Exterminator's Oath: the drops roll twice.
        const rolls = state.oath > 0 ? 2 : 1;
        if (state.oath > 0) state.oath -= 1;
        for (let roll = 0; roll < rolls; roll++) {
            for (const drop of def.drops) if (rng.chance(drop.chance)) gain(drop.itemId, between(rng, drop.quantity));
        }
        result.xp += def.xp;
        log.push(`${how} the ${def.name} at ${tileName(pest.tile)}.`);
    };
    const pestsOn = (tiles: Set<number>) => state.pests.filter((pest) => tiles.has(pest.tile));
    /** One hit: an elite pest loses a point, anything else (or an elite on its last) is cleared. */
    const hit = (pest: FarmPest, how: string, log = result.log) => {
        const left = (pest.hp ?? 1) - 1;
        if (left <= 0) return clearPest(pest, how, log);
        pest.hp = left;
        log.push(`Hit the ${pestDef(pest).name} at ${tileName(pest.tile)}: ${left} more to go.`);
    };
    const isElite = (pest: FarmPest) => (pest.hp ?? 1) > 1;
    const newPest = (def: PestDef, tile: number): FarmPest => {
        const pest: FarmPest = { id: state.nextPestId++, pestId: def.id, tile, age: 0, intent: { kind: "move", tile }, hp: def.hp };
        state.pests.push(pest);
        return pest;
    };
    const blessed = (id: BlessingId) => state.blessings.some((blessing) => blessing.id === id && blessing.turnsLeft > 0);
    /** Nuclear waste onto a tile, killing what grows there. */
    const makeWaste = (index: number, log: string[]) => {
        const tile = state.tiles[index]!;
        if (!tile.owned || tile.structure || tile.waste) return false;
        if (tile.crop) log.push(`Waste killed the ${cropDef(tile.crop).name} at ${tileName(index)}.`);
        tile.crop = null;
        tile.waste = true;
        return true;
    };

    const structureDef = (structure: FarmStructure) => {
        const def = ctx.structures[structure.structureId];
        if (!def) throw new Error(`Unknown structure "${structure.structureId}"`);
        return def;
    };
    /** Every structure of `kind` on the farm, with its tile. */
    const structuresOf = (kind: StructureDef["effect"]["kind"]) =>
        state.tiles.flatMap((tile, index) =>
            tile.owned && tile.structure && structureDef(tile.structure).effect.kind === kind ? [{ index, structure: tile.structure, def: structureDef(tile.structure) }] : [],
        );
    const structureAt = (index: number, kind: StructureDef["effect"]["kind"]) => {
        const structure = ownedTile(index).structure;
        if (!structure || structureDef(structure).effect.kind !== kind) return null;
        return structure;
    };
    /** Crop waste (a harvest or clear) into every Compost Bin with room. */
    const addCompost = () => {
        for (const { structure, def } of structuresOf("compost")) {
            if (def.effect.kind === "compost") structure.compost = Math.min(def.effect.capacity, structure.compost + 1);
        }
    };
    const noStructure = (tile: FarmTile) => {
        if (tile.structure) throw new FarmRuleError("A structure stands there");
        return tile;
    };

    const ripeAt = (index: number) => {
        const crop = ownedTile(index).crop;
        if (!crop || crop.rotten) throw new FarmRuleError(crop ? "It's rotten. Clear it." : "Nothing grows there");
        if (!isRipe(crop, cropDef(crop))) throw new FarmRuleError("It isn't ripe yet");
        return crop;
    };

    /** What pests did on Advance, logged after the growth line. */
    const pestNotes: string[] = [];

    switch (action.type) {
        case "plant": {
            const tile = noStructure(ownedTile(action.tile));
            if (tile.crop) throw new FarmRuleError("Something already grows there");
            if (tile.waste) throw new FarmRuleError("Nothing grows in nuclear waste. Scrub it first");
            const packed = ctx.seedBag.find((entry) => entry.slot === action.slot);
            if (!packed || packed.quantity <= 0) throw new FarmRuleError("That Seed Bag slot is empty");
            const def = Object.values(crops).find((crop) => crop.seed === packed.itemId);
            if (!def) throw new FarmRuleError("Those aren't seeds that grow");
            tile.crop = { cropId: def.id, stage: 0, ripeTurns: 0, held: false, rotten: false };
            result.seedUsed = { slot: packed.slot, itemId: packed.itemId, from: packed.quantity };
            result.log.push(`Planted ${def.name} at ${tileName(action.tile)}.`);
            break;
        }
        case "water": {
            const tile = ownedTile(action.tile);
            if (tile.moisture >= GEO_FARM_MAX_MOISTURE) throw new FarmRuleError("It's already soaked");
            // A Well with water in it saves the Labor.
            const well = structuresOf("well").find(({ structure }) => structure.water > 0);
            if (well) well.structure.water -= 1;
            else spendLabor(config.labor.water);
            tile.moisture += 1;
            result.log.push(`Watered ${tileName(action.tile)}${well ? " from the Well" : ""}.`);
            break;
        }
        case "harvest": {
            ripeAt(action.tile);
            spendLabor(config.labor.harvest);
            harvest(action.tile, 0);
            break;
        }
        case "clear": {
            const tile = ownedTile(action.tile);
            if (!tile.crop) throw new FarmRuleError("Nothing grows there");
            spendLabor(config.labor.clear);
            result.log.push(`Cleared the ${tile.crop.rotten ? "rotten " : ""}${cropDef(tile.crop).name} at ${tileName(action.tile)}.`);
            tile.crop = null;
            addCompost();
            break;
        }
        case "swat": {
            ownedTile(action.tile);
            const here = pestsOn(new Set([action.tile]));
            if (here.length === 0) throw new FarmRuleError("No pests there");
            spendLabor(config.labor.swat);
            for (const pest of here) hit(pest, "Swatted");
            break;
        }
        case "place": {
            const tile = noStructure(ownedTile(action.tile));
            if (tile.crop) throw new FarmRuleError("Clear the crop first");
            if (tile.waste) throw new FarmRuleError("Scrub the waste off first");
            if (state.pests.some((pest) => pest.tile === action.tile)) throw new FarmRuleError("Deal with the pests there first");
            const def = Object.values(ctx.structures).find((entry) => entry.itemId === action.itemId);
            if (!def) throw new FarmRuleError("That isn't a farm structure");
            if ((ctx.held[action.itemId] ?? 0) < 1) throw new FarmRuleError(`You have no ${def.name}`);
            tile.structure = { structureId: def.id, tune: null, caged: null, compost: 0, open: false, water: 0 };
            result.itemsUsed.push({ itemId: def.itemId, quantity: 1 });
            result.log.push(`Built a ${def.name} at ${tileName(action.tile)}.`);
            break;
        }
        case "pickup": {
            const tile = ownedTile(action.tile);
            if (!tile.structure) throw new FarmRuleError("No structure there");
            if (tile.structure.caged) throw new FarmRuleError("Let the pest out first");
            const def = structureDef(tile.structure);
            tile.structure = null;
            gain(def.itemId, 1);
            result.log.push(`Packed up the ${def.name}.`);
            break;
        }
        case "tune": {
            const jukebox = structureAt(action.tile, "jukebox");
            if (!jukebox) throw new FarmRuleError("No Jukebox there");
            if (action.pestId !== null && !ctx.pests[action.pestId]) throw new FarmRuleError("No pest has that tune");
            jukebox.tune = action.pestId;
            result.log.push(action.pestId ? `The Jukebox plays the ${ctx.pests[action.pestId]!.name}'s tune.` : "The Jukebox falls quiet.");
            break;
        }
        case "cage": {
            ownedTile(action.tile);
            const pest = state.pests.find((entry) => entry.tile === action.tile && !isElite(entry));
            if (!pest) throw new FarmRuleError(state.pests.some((entry) => entry.tile === action.tile) ? "That one's too strong to cage" : "No pest there");
            const cage = [action.tile, ...around(state, action.tile, 1)]
                .map((index) => structureAt(index, "cage"))
                .find((structure) => structure && !structure.caged);
            if (!cage) throw new FarmRuleError("Needs an empty Pest Cage on or next to the tile");
            spendLabor(config.labor.cage);
            cage.caged = pest.pestId;
            state.pests = state.pests.filter((other) => other.id !== pest.id);
            result.log.push(`Caged the ${pestDef(pest).name}.`);
            break;
        }
        case "release": {
            const cage = structureAt(action.tile, "cage");
            if (!cage?.caged) throw new FarmRuleError("No caged pest there");
            const pestId = cage.caged;
            cage.caged = null;
            clearPest({ id: -1, pestId, tile: action.tile, age: 0, intent: { kind: "move", tile: action.tile } }, "Let out and cleared");
            break;
        }
        case "turn-in": {
            const cage = structureAt(action.tile, "cage");
            if (!cage?.caged) throw new FarmRuleError("No caged pest there");
            const def = ctx.pests[cage.caged];
            if (!def) throw new Error(`Unknown pest "${cage.caged}"`);
            cage.caged = null;
            const bounty = def.bounty;
            state.pesthunterPoints += bounty;
            result.log.push(`The Pesthunter took the ${def.name}. +${bounty} Pesthunter point${bounty === 1 ? "" : "s"}.`);
            break;
        }
        case "pesthunter-buy": {
            const offer = config.pesthunter.shop[action.offer];
            if (!offer) throw new FarmRuleError("The Pesthunter doesn't sell that");
            if (state.pesthunterPoints < offer.price) throw new FarmRuleError(`That needs ${offer.price} Pesthunter points; you have ${state.pesthunterPoints}`);
            state.pesthunterPoints -= offer.price;
            gain(offer.itemId, 1);
            result.log.push(`Traded ${offer.price} Pesthunter points with the Pesthunter.`);
            break;
        }
        case "home": {
            const { latitude, longitude } = action;
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
                throw new FarmRuleError("That isn't a place on Earth");
            }
            const region = toRegion(latitude, longitude, config);
            if (state.home && regionKey(state.home) === regionKey(region)) throw new FarmRuleError("Your weather already comes from around here");
            const movable = homeMovableAt(state, config, ctx.now);
            if (movable) throw new FarmRuleError(`Your weather can move again on ${movable.toISOString().slice(0, 10)}`);
            state.home = { ...region, setAt: ctx.now.toISOString() };
            result.log.push("Your farm's weather now comes from around here.");
            break;
        }
        case "amend": {
            const tile = noStructure(ownedTile(action.tile));
            const amendment = config.soil.amendments.find((entry) => entry.itemId === action.itemId);
            if (!amendment) throw new FarmRuleError("That doesn't change soil");
            if ((ctx.held[action.itemId] ?? 0) < 1) throw new FarmRuleError("You have none of that");
            if (tile.soil === amendment.soil) throw new FarmRuleError("The soil there is that already");
            tile.soil = amendment.soil;
            result.itemsUsed.push({ itemId: action.itemId, quantity: 1 });
            result.log.push(`The soil at ${tileName(action.tile)} is ${amendment.soil} now.`);
            break;
        }
        case "scrub": {
            const tile = ownedTile(action.tile);
            if (!tile.waste) throw new FarmRuleError("There's no waste there");
            spendLabor(config.labor.scrub);
            tile.waste = false;
            result.log.push(`Scrubbed the waste off ${tileName(action.tile)}.`);
            break;
        }
        case "offer": {
            if (!structureAt(action.tile, "shrine")) throw new FarmRuleError("No Shrine there");
            if (!Number.isInteger(action.quantity) || action.quantity < 1) throw new FarmRuleError("Offer at least one");
            if ((ctx.held[action.itemId] ?? 0) < action.quantity) throw new FarmRuleError("You don't have that many");
            const value = ctx.sellValue(action.itemId) * action.quantity;
            if (value <= 0) throw new FarmRuleError("The Shrine wants nothing to do with that");
            result.itemsUsed.push({ itemId: action.itemId, quantity: action.quantity });
            const { halfValue, curseShare, blessings } = config.shrine;
            const answer = (curse: boolean) => {
                const choices = blessings.filter((entry) => entry.curse === curse && entry.weight > 0);
                let roll = rng.next() * choices.reduce((sum, entry) => sum + entry.weight, 0);
                const chosen = choices.find((entry) => (roll -= entry.weight) < 0) ?? choices[choices.length - 1];
                if (!chosen) return;
                const existing = state.blessings.find((entry) => entry.id === chosen.id);
                if (existing) existing.turnsLeft = Math.max(existing.turnsLeft, chosen.turns);
                else state.blessings.push({ id: chosen.id, turnsLeft: chosen.turns });
                result.log.push(`The Shrine answers: ${chosen.name}. ${chosen.description}`);
            };
            if (rng.chance(value / (value + halfValue))) {
                answer(false);
            } else {
                if (rng.chance(curseShare)) answer(true);
                else result.log.push("The Shrine takes it in silence.");
                // What it keeps, it leaves as ash.
                gain(config.soil.ashItem, 1);
            }
            break;
        }
        case "buy": {
            const offer = state.activeEvent?.offers[action.offer];
            if (!offer) throw new FarmRuleError("Nobody's selling that");
            if (offer.bought) throw new FarmRuleError("You've bought that already");
            offer.bought = true;
            result.coins = offer.price;
            gain(offer.itemId, 1);
            result.log.push("Bought from the Travelling Merchant.");
            break;
        }
        case "accept-order": {
            const order = state.orders?.list.find((entry) => entry.id === action.orderId);
            if (!order) throw new FarmRuleError("That order isn't on the board");
            if (order.status !== "offered") throw new FarmRuleError("You've taken that order already");
            order.status = "accepted";
            result.coins = order.deposit;
            result.log.push(`Took the order: ${order.quantity} by the week's end.`);
            break;
        }
        case "deliver-order": {
            const order = state.orders?.list.find((entry) => entry.id === action.orderId);
            if (!order || order.status !== "accepted") throw new FarmRuleError("Take the order on first");
            // Rush Order: one crop of this delivery counts double.
            const rush = state.rushOrder ? 1 : 0;
            const handing = Math.min(ctx.held[order.itemId] ?? 0, order.quantity - order.delivered - rush);
            if ((ctx.held[order.itemId] ?? 0) <= 0) throw new FarmRuleError("You have none of that to hand in");
            state.rushOrder = false;
            order.delivered += Math.max(0, handing) + rush;
            if (handing > 0) result.itemsUsed.push({ itemId: order.itemId, quantity: handing });
            if (order.delivered >= order.quantity) {
                order.status = "done";
                result.coinsGained = order.reward + order.deposit;
                result.log.push(`Order complete: +${order.reward} coins, and the ${order.deposit} deposit back.`);
            } else {
                result.log.push(`Handed in ${handing}: ${order.quantity - order.delivered} to go.`);
            }
            break;
        }
        case "play": {
            const card = ctx.hand.find((entry) => entry.inventoryId === action.inventoryId);
            if (!card) throw new FarmRuleError("That card isn't in your farming hand");
            if (card.chargesLeft <= 0) throw new FarmRuleError("That card has faded");
            if (!isFarmingCardId(card.cardId)) throw new FarmRuleError("That isn't a farming card");
            spendLabor(FARMING_CARDS[card.cardId].labor);
            playCard(card.cardId, action.tile);
            result.cardPlayed = { inventoryId: card.inventoryId, chargesLeft: card.chargesLeft - 1 };
            break;
        }
        case "advance": {
            if (state.turnsBanked <= 0) throw new FarmRuleError("No Farm Turns banked. One comes in every few hours.");
            advance();
            break;
        }
        case "unlock": {
            if (!isUnlockable(state, action.tile)) throw new FarmRuleError("Only a locked tile next to your farm can be bought");
            result.coins = unlockCost(state, config) ?? 0;
            state.tiles[action.tile]!.owned = true;
            state.unlocked += 1;
            result.log.push(`Bought the tile at ${tileName(action.tile)}.`);
            break;
        }
        case "blueprint": {
            const tile = tileAt(action.tile);
            if (action.cropId !== null && !crops[action.cropId]) throw new FarmRuleError("Unknown crop");
            tile.blueprint = action.cropId;
            break;
        }
    }

    state.seed = newSeed(rng);
    return result;

    function playCard(cardId: FarmingCardId, index: number) {
        switch (cardId) {
            case "farm.bucket-line": {
                const { y } = tileXY(index);
                ownedTile(index);
                let watered = 0;
                for (let x = 0; x < N; x++) {
                    const tile = state.tiles[indexOf(x, y)]!;
                    if (tile.owned && tile.moisture < GEO_FARM_MAX_MOISTURE) {
                        tile.moisture += 1;
                        watered += 1;
                    }
                }
                result.log.push(`Bucket Line watered ${watered} tiles in row ${y + 1}.`);
                return;
            }
            case "farm.deep-soak": {
                const tile = ownedTile(index);
                tile.moisture = GEO_FARM_MAX_MOISTURE;
                tile.soakTurns = 2;
                result.log.push(`Deep Soak at ${tileName(index)}: it drinks nothing for 2 turns.`);
                return;
            }
            case "farm.careful-pick": {
                ripeAt(index);
                harvest(index, 1);
                return;
            }
            case "farm.scythe-sweep": {
                const { x, y } = tileXY(index);
                tileAt(index);
                const ripe: number[] = [];
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (!inGrid(x + dx, y + dy)) continue;
                        const at = indexOf(x + dx, y + dy);
                        const crop = state.tiles[at]!.crop;
                        if (state.tiles[at]!.owned && crop && isRipe(crop, cropDef(crop))) ripe.push(at);
                    }
                }
                if (ripe.length === 0) throw new FarmRuleError("Nothing ripe in reach of the scythe");
                for (const at of ripe) harvest(at, -1);
                return;
            }
            case "farm.ripen": {
                const tile = ownedTile(index);
                const crop = tile.crop;
                if (!crop || crop.rotten || isRipe(crop, cropDef(crop))) throw new FarmRuleError("Ripen needs a growing crop");
                crop.stage += 1;
                tile.fertility = Math.max(0, tile.fertility - 1);
                result.log.push(`${cropDef(crop).name} at ${tileName(index)} grew a stage.`);
                return;
            }
            case "farm.hold": {
                const crop = ripeAt(index);
                crop.held = true;
                result.log.push(`${cropDef(crop).name} at ${tileName(index)} is held for a turn.`);
                return;
            }
            case "farm.green-manure": {
                const tile = ownedTile(index);
                if (!tile.crop) throw new FarmRuleError("Green Manure needs a crop to dig in");
                const name = cropDef(tile.crop).name;
                tile.crop = null;
                addCompost();
                tile.fertility = Math.min(GEO_FARM_MAX_FERTILITY, tile.fertility + 3);
                result.log.push(`Dug the ${name} at ${tileName(index)} back in: +3 fertility.`);
                return;
            }
            case "farm.read-sky": {
                state.skyRead = true;
                result.log.push("You read the sky: three turns of weather ahead.");
                return;
            }
            case "farm.smoke": {
                tileAt(index);
                const reach = new Set([index, ...around(state, index, 1)]);
                const caught = pestsOn(reach);
                if (caught.length === 0) throw new FarmRuleError("No pests in reach of the smoke");
                for (const pest of caught) hit(pest, "Smoked out");
                for (const at of reach) {
                    const crop = state.tiles[at]!.crop;
                    if (crop && crop.ripeTurns > 0) crop.ripeTurns = 0;
                }
                return;
            }
            case "farm.bait-ring": {
                ownedTile(index);
                const pulled = pestsOn(new Set(around(state, index, 1)));
                if (pulled.length === 0) throw new FarmRuleError("No pests around to draw in");
                for (const pest of pulled) {
                    pest.tile = index;
                    pest.intent = planIntent(state, pest, pestDef(pest), rng);
                }
                result.log.push(`Bait Ring drew ${pulled.length} pest${pulled.length === 1 ? "" : "s"} onto ${tileName(index)}.`);
                return;
            }
            case "farm.hand-pollinate": {
                const tile = ownedTile(index);
                if (tile.crop || tile.structure) throw new FarmRuleError("Hand Pollinate needs an empty tile for something to sprout on");
                tile.pollinated = true;
                for (const at of around(state, index, 1)) {
                    const crop = state.tiles[at]!.crop;
                    if (crop && crop.ripeTurns > 0) crop.ripeTurns = 0;
                }
                result.log.push(`Hand pollinated around ${tileName(index)}.`);
                return;
            }
            case "farm.coax": {
                const tile = noStructure(ownedTile(index));
                if (tile.crop || tile.waste) throw new FarmRuleError("Coax needs an empty tile");
                // As things will stand on the coming Advance: its weather and events.
                const weather = state.turnWeather[0] ?? weatherAt(state, config, state.turn + 1);
                const holding = Object.values(ctx.mutations).filter((mutation) => recipeHolds(index, mutation, weather, [state.nextEvent ?? undefined, ctx.globalEvent?.id]));
                const sprouted = holding.find((mutation) => rng.chance(mutation.chance * COAX_SHARE));
                if (sprouted) {
                    tile.crop = { cropId: sprouted.id, stage: 0, ripeTurns: 0, held: false, rotten: false };
                    result.log.push(`Coaxed something out at ${tileName(index)}: ${sprouted.name}!`);
                } else {
                    tile.fertility = Math.max(0, tile.fertility - 2);
                    result.log.push(`Nothing came of it at ${tileName(index)}; the soil there is tired (−2 fertility).`);
                }
                return;
            }
            case "farm.compost-spread": {
                ownedTile(index);
                const bin = structuresOf("compost").find(({ structure }) => structure.compost >= 2);
                if (!bin) throw new FarmRuleError("Needs a Compost Bin with 2 compost");
                bin.structure.compost -= 2;
                const { x, y } = tileXY(index);
                for (const [nx, ny] of [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
                    const tile = inGrid(nx, ny) ? state.tiles[indexOf(nx, ny)]! : null;
                    if (tile?.owned) tile.fertility = Math.min(GEO_FARM_MAX_FERTILITY, tile.fertility + 2);
                }
                result.log.push(`Spread compost around ${tileName(index)}: +2 fertility.`);
                return;
            }
            case "farm.lime-dust": {
                tileAt(index);
                const reach = [index, ...around(state, index, 1)];
                for (const at of reach) if (state.tiles[at]!.owned) state.tiles[at]!.limed = true;
                result.log.push(`Limed around ${tileName(index)}: the soil holds, and nothing there grows next turn.`);
                return;
            }
            case "farm.moon-rite": {
                const moon = ctx.events["blood-moon"];
                if (!moon) throw new FarmRuleError("The moon won't answer");
                state.nextEvent = moon.id;
                result.log.push("The rite is done. The next Advance comes under a Blood Moon.");
                return;
            }
            case "farm.exterminators-oath": {
                state.oath += 3;
                result.log.push("You swear the oath: the next 3 pests cleared drop twice.");
                return;
            }
            case "farm.rush-order": {
                if (!state.orders?.list.some((order) => order.status === "accepted")) throw new FarmRuleError("Take an order on first");
                if (state.rushOrder) throw new FarmRuleError("A rush is already on");
                state.rushOrder = true;
                result.log.push("Rushed: your next delivery counts one crop more.");
                return;
            }
            case "farm.chain-reaction": {
                const wasted = state.tiles.flatMap((tile, at) => (tile.owned && tile.waste ? [at] : []));
                if (wasted.length === 0) throw new FarmRuleError("There's no waste to set off");
                const mutations = Object.values(ctx.mutations);
                const glow = ctx.pests[config.waste.pest];
                for (const at of wasted) {
                    const tile = state.tiles[at]!;
                    if (mutations.length > 0 && rng.chance(CHAIN_REACTION_CHANCE)) {
                        const mutation = pick(rng, mutations);
                        tile.waste = false;
                        tile.crop = { cropId: mutation.id, stage: 0, ripeTurns: 0, held: false, rotten: false };
                        result.log.push(`The waste at ${tileName(at)} burned into ${mutation.name}!`);
                    } else if (glow) {
                        newPest(glow, at);
                        result.log.push(`The waste at ${tileName(at)} fizzled: a ${glow.name} crawled out.`);
                    }
                }
                return;
            }
            case "farm.mulch": {
                const { y } = tileXY(index);
                ownedTile(index);
                for (let x = 0; x < N; x++) {
                    const tile = state.tiles[indexOf(x, y)]!;
                    if (tile.owned && !tile.structure) tile.soilOverlay = { soil: "boggy", turnsLeft: 2 };
                }
                result.log.push(`Mulched row ${y + 1}: Boggy for 2 turns.`);
                return;
            }
            case "farm.hex-the-earth": {
                const tile = noStructure(ownedTile(index));
                tile.soilOverlay = { soil: "cursed", turnsLeft: 1 };
                result.log.push(`Hexed the soil at ${tileName(index)}: Cursed for a turn.`);
                return;
            }
            case "farm.hazmat-scrub": {
                const tile = ownedTile(index);
                if (!tile.waste) throw new FarmRuleError("There's no waste there");
                tile.waste = false;
                result.log.push(`Scrubbed the waste off ${tileName(index)}.`);
                return;
            }
            case "farm.controlled-leak": {
                ownedTile(index);
                const { x, y } = tileXY(index);
                const beside = ([[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const).filter(([nx, ny]) => inGrid(nx, ny)).map(([nx, ny]) => indexOf(nx, ny));
                const leaked = beside.filter((at) => makeWaste(at, result.log)).length;
                if (leaked === 0) throw new FarmRuleError("Nowhere beside it for the waste to go");
                result.log.push(`Leaked waste onto ${leaked} tile${leaked === 1 ? "" : "s"} around ${tileName(index)}.`);
                return;
            }
            case "farm.tear-the-veil": {
                const portal = structureAt(index, "portal");
                if (!portal) throw new FarmRuleError("Tear the Veil needs a Portal");
                if (portal.open) throw new FarmRuleError("It's already open");
                portal.open = true;
                result.log.push("The Portal tears open. Something is coming through on the next Advance.");
                return;
            }
            case "farm.snap-trap": {
                const tile = ownedTile(index);
                if (tile.trap) throw new FarmRuleError("There's a trap there already");
                tile.trap = true;
                result.log.push(`Set a Snap Trap at ${tileName(index)}.`);
                return;
            }
        }
    }

    /** Everything moves on one turn: weather, growth, ripe crops' push-your-luck, fallow soil. */
    function advance() {
        const weather = state.turnWeather.shift() ?? weatherAt(state, config, state.turn + 1);
        const event = state.nextEvent ? ctx.events[state.nextEvent] : undefined;
        state.nextEvent = null;
        state.activeEvent = null;
        const global = ctx.globalEvent;
        if (event) result.log.push(`${event.name}! ${event.description}`);
        if (global) result.log.push(`${global.name}, everywhere! ${global.description}`);
        state.turn += 1;
        state.turnsBanked -= 1;
        state.labor = laborFor(config, ctx.farmingLevel);
        state.skyRead = false;

        frogsEat();
        const sapped = actPests();
        const infested = new Set(state.pests.map((pest) => pest.tile));

        let grew = 0;
        let dry = 0;
        const notes: string[] = [];

        // Greenhouses shelter the tiles around them: those grow as on a clear day.
        const sheltered = new Set(structuresOf("greenhouse").flatMap(({ index }) => around(state, index, 1)));
        // Lightning Rods take the storm's strikes for the crops around them.
        const grounded = new Set(
            structuresOf("lightning-rod").flatMap(({ index, def }) => (def.effect.kind === "lightning-rod" ? around(state, index, def.effect.radius) : [])),
        );
        for (const { structure, def } of structuresOf("well")) {
            if (def.effect.kind !== "well") continue;
            const change = weather === "rain" ? def.effect.rain : weather === "storm" ? def.effect.storm : weather === "heatwave" ? -def.effect.heatwave : 0;
            structure.water = Math.max(0, Math.min(def.effect.capacity, structure.water + change));
        }
        const skyOver = (index: number): GeoFarmWeather => (sheltered.has(index) ? "clear" : weather);
        for (const [index, tile] of state.tiles.entries()) {
            if (!tile.owned) continue;
            const sky = skyOver(index);
            if (sky === "rain" || sky === "storm") tile.moisture = Math.min(GEO_FARM_MAX_MOISTURE, tile.moisture + 2);
            if (sky === "heatwave") tile.moisture = Math.max(0, tile.moisture - 1);
            // Boggy soil holds its water whatever the sky does.
            if (soilOf(tile) === "boggy" && tile.moisture < 1) tile.moisture = 1;
            const crop = tile.crop;
            if (!crop || crop.rotten) continue;
            if (sky === "storm" && !grounded.has(index) && rng.chance(config.weather.stormFlattenChance)) {
                notes.push(`The storm flattened the ${cropDef(crop).name} at ${tileName(index)}.`);
                tile.crop = null;
            } else if (sky === "frost" && !isRipe(crop, cropDef(crop)) && crop.stage <= config.weather.frostKillsUpToStage) {
                notes.push(`Frost killed the young ${cropDef(crop).name} at ${tileName(index)}.`);
                tile.crop = null;
            }
        }
        // Ponds keep the tiles beside them wet, after the weather has had its say.
        for (const { index } of structuresOf("pond")) {
            const { x, y } = tileXY(index);
            for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
                const tile = inGrid(nx, ny) ? state.tiles[indexOf(nx, ny)]! : null;
                if (tile?.owned && tile.moisture < 1) tile.moisture = 1;
            }
        }
        // Reactors: extra stages for crops in range.
        const reactors = structuresOf("reactor");
        const boosted = (index: number) =>
            reactors.reduce((extra, { index: at, def }) => {
                if (def.effect.kind !== "reactor") return extra;
                const a = tileXY(index);
                const b = tileXY(at);
                return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= def.effect.radius ? Math.max(extra, def.effect.growth) : extra;
            }, 0);
        for (const { index, def } of structuresOf("beehive")) {
            if (def.effect.kind !== "beehive" || !rng.chance(def.effect.swarmChance)) continue;
            for (const at of around(state, index, 1)) sapped.add(at);
            notes.push(`The bees swarmed at ${tileName(index)}: the crops around won't grow this turn.`);
        }
        for (const [index, tile] of state.tiles.entries()) {
            if (!tile.owned) continue;

            const crop = tile.crop;
            if (!crop) {
                // Soil with a pest, a structure or waste on it doesn't rest.
                const rich = soilOf(tile) === "rich";
                const cap = rich ? config.soil.richFallowCap : config.fallowCap;
                const recovery = rich ? config.soil.richRecovery : config.fallowRecovery;
                if (tile.fertility < cap && !infested.has(index) && !tile.structure && !tile.waste) tile.fertility = Math.min(cap, tile.fertility + recovery);
            } else if (!crop.rotten) {
                const def = cropDef(crop);
                if (isRipe(crop, def)) {
                    if (crop.held) {
                        crop.held = false;
                    } else if (rng.chance(rotChance(crop, def, config))) {
                        crop.rotten = true;
                        notes.push(`The ${def.name} at ${tileName(index)} rotted.`);
                    } else {
                        crop.ripeTurns = Math.min(crop.ripeTurns + 1, config.rotChances.length);
                    }
                } else if (sapped.has(index) || skyOver(index) === "frost" || tile.limed) {
                    // Sapped or frozen: no growth, and no water drunk.
                } else if (tile.soakTurns > 0 || skyOver(index) === "overcast" || tile.moisture > 0) {
                    // Soaked tiles and overcast skies cost no water.
                    if (tile.soakTurns === 0 && skyOver(index) !== "overcast") tile.moisture -= 1;
                    crop.stage = Math.min(def.stages, crop.stage + 1 + boosted(index) + (blessed("growth") ? 1 : 0));
                    grew += 1;
                    if (isRipe(crop, def)) notes.push(`The ${def.name} at ${tileName(index)} is ripe.`);
                } else {
                    dry += 1;
                }
            }
            if (tile.soakTurns > 0) tile.soakTurns -= 1;
            // A trap lasts one Advance, caught or not.
            tile.trap = false;
        }

        const label = weather[0]!.toUpperCase() + weather.slice(1);
        result.log.push(`Turn ${state.turn}: ${label}. ${grew} crop${grew === 1 ? "" : "s"} grew${dry ? `, ${dry} too dry to grow` : ""}.`);
        result.log.push(...notes, ...pestNotes);

        for (const { index, structure } of structuresOf("compost")) {
            if (structure.compost <= 0) continue;
            structure.compost -= 1;
            for (const at of around(state, index, 1)) {
                const tile = state.tiles[at]!;
                tile.fertility = Math.min(GEO_FARM_MAX_FERTILITY, tile.fertility + 1);
            }
        }

        let ring: number | null = null;
        if (event?.effect.kind === "fairy-ring") {
            const empty = state.tiles.flatMap((tile, index) => (tile.owned && !tile.crop && !tile.structure ? [index] : []));
            if (empty.length > 0) {
                ring = pick(rng, empty);
                for (const at of around(state, ring, 1)) {
                    const tile = state.tiles[at]!;
                    tile.fertility = Math.min(GEO_FARM_MAX_FERTILITY, tile.fertility + event.effect.fertility);
                }
                result.log.push(`The mushrooms ring ${tileName(ring)}: rich soil around it, and something stirring inside.`);
            }
        }
        const meteor = [event, global].find((entry) => entry?.effect.kind === "meteor-shower");
        if (meteor?.effect.kind === "meteor-shower") {
            for (const [index, tile] of state.tiles.entries()) {
                if (!tile.owned || tile.crop || tile.structure || !rng.chance(meteor.effect.dropChance)) continue;
                gain(meteor.effect.itemId, 1);
                result.log.push(`Something fell at ${tileName(index)}, still glowing.`);
            }
        }
        sproutMutations(weather, sheltered, event, ring);

        const pestBoost =
            [event, global].reduce((boost, entry) => (entry?.effect.kind === "blood-moon" ? boost * entry.effect.pestBoost : boost), 1) *
            (blessed("pests") ? 2 : 1);
        spawnPest(sheltered, pestBoost, false);
        if (event?.effect.kind === "pest-swarm") for (let i = 0; i < event.effect.count; i++) spawnPest(sheltered, 1, true);

        if (event?.effect.kind === "bumper-harvest") state.activeEvent = { eventId: event.id, offers: [] };
        if (event?.effect.kind === "merchant") {
            const stock = [...event.effect.stock];
            const offers = Array.from({ length: Math.min(event.effect.count, stock.length) }, () => {
                const offer = stock.splice(Math.floor(rng.next() * stock.length), 1)[0]!;
                return { ...offer, bought: false };
            });
            state.activeEvent = { eventId: event.id, offers };
        }
        // Ponds turn up peat now and then.
        const ponds = structuresOf("pond").length;
        for (let i = 0; i < ponds; i++) if (rng.chance(config.soil.peatChance)) gain(config.soil.peatItem, 1);
        atomicAge();
        openPortals();
        rollNextEvent();
        for (const pest of state.pests) pest.intent = planIntent(state, pest, pestDef(pest), rng);
        for (const tile of state.tiles) {
            tile.limed = false;
            if (!tile.soilOverlay) continue;
            tile.soilOverlay.turnsLeft -= 1;
            if (tile.soilOverlay.turnsLeft <= 0) tile.soilOverlay = null;
        }
        for (const blessing of state.blessings) blessing.turnsLeft -= 1;
        state.blessings = state.blessings.filter((blessing) => blessing.turnsLeft > 0);
    }

    /** Each Pond's frog eats one pest on or around it, before pests act. No drops: the frog had them. */
    function frogsEat() {
        for (const { index } of structuresOf("pond")) {
            const reach = new Set([index, ...around(state, index, 1)]);
            // An elite is more than a frog can swallow.
            const near = pestsOn(reach).filter((pest) => !isElite(pest));
            if (near.length === 0) continue;
            const eaten = pick(rng, near);
            state.pests = state.pests.filter((pest) => pest.id !== eaten.id);
            pestNotes.push(`The frog in the Pond at ${tileName(index)} ate the ${pestDef(eaten).name}.`);
        }
    }

    /** Every pest makes its telegraphed move. Returns the tiles whose crops were sapped. */
    function actPests(): Set<number> {
        const sapped = new Set<number>();
        const trapped = (pest: FarmPest) => {
            if (!state.tiles[pest.tile]!.trap) return false;
            state.tiles[pest.tile]!.trap = false;
            hit(pest, "Snap Trap caught", pestNotes);
            return !state.pests.includes(pest);
        };
        for (const pest of [...state.pests]) {
            const def = pestDef(pest);
            const intent = pest.intent;
            pest.age += 1;
            if ((intent.kind === "eat" || intent.kind === "move") && intent.tile !== pest.tile && state.tiles[intent.tile]?.owned) {
                pest.tile = intent.tile;
                if (trapped(pest)) continue;
            }
            const tile = state.tiles[pest.tile]!;
            switch (intent.kind) {
                case "eat": {
                    if (pest.tile !== intent.tile || !tile.crop || tile.crop.rotten) {
                        pestNotes.push(`The ${def.name} found nothing to eat.`);
                        break;
                    }
                    pestNotes.push(`The ${def.name} ate the ${cropDef(tile.crop).name} at ${tileName(pest.tile)}.`);
                    tile.crop = null;
                    break;
                }
                case "drain":
                    if (!tile.limed) tile.fertility = Math.max(0, tile.fertility - intent.amount);
                    break;
                case "sap":
                    sapped.add(pest.tile);
                    break;
                case "breed": {
                    sapped.add(pest.tile);
                    if (!state.tiles[intent.tile]?.owned) break;
                    const young = newPest(def, intent.tile);
                    pestNotes.push(`The ${def.name} bred onto ${tileName(intent.tile)}.`);
                    trapped(young);
                    break;
                }
                case "move":
                    break;
            }
        }
        return sapped;
    }

    /** Waste spreads, Reactors leak more, and glowing pests crawl out of it. */
    function atomicAge() {
        const { spreadChance, pestChance, pest } = config.waste;
        const wasted = state.tiles.flatMap((tile, index) => (tile.owned && tile.waste ? [index] : []));
        for (const index of wasted) {
            if (!rng.chance(spreadChance)) continue;
            const { x, y } = tileXY(index);
            const beside = ([[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const).filter(([nx, ny]) => inGrid(nx, ny)).map(([nx, ny]) => indexOf(nx, ny));
            const open = beside.filter((at) => state.tiles[at]!.owned && !state.tiles[at]!.structure && !state.tiles[at]!.waste);
            if (open.length > 0 && makeWaste(pick(rng, open), result.log)) result.log.push(`The waste at ${tileName(index)} spread.`);
        }
        for (const { index, def } of structuresOf("reactor")) {
            if (def.effect.kind !== "reactor" || !rng.chance(def.effect.wasteChance)) continue;
            const radius = def.effect.radius;
            const { x, y } = tileXY(index);
            const candidates = state.tiles.flatMap((tile, at) => {
                const p = tileXY(at);
                return Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= radius && tile.owned && !tile.structure && !tile.waste ? [at] : [];
            });
            if (candidates.length > 0) {
                const at = pick(rng, candidates);
                makeWaste(at, result.log);
                result.log.push(`The Reactor leaked: waste at ${tileName(at)}.`);
            }
        }
        const glow = ctx.pests[pest];
        if (!glow) return;
        for (const index of wasted) {
            if (state.pests.length >= config.pests.max * 2 || !rng.chance(pestChance)) continue;
            newPest(glow, index);
            result.log.push(`A ${glow.name} crawled out of the waste at ${tileName(index)}.`);
        }
    }

    /** Each torn-open Portal lets its wave of elite pests through, then shuts. */
    function openPortals() {
        for (const { index, structure, def } of structuresOf("portal")) {
            if (!structure.open || def.effect.kind !== "portal") continue;
            structure.open = false;
            const spots = around(state, index, 1);
            for (let i = 0; i < def.effect.wave; i++) {
                const elite = ctx.pests[pick(rng, def.effect.pests)];
                if (!elite) continue;
                newPest(elite, spots.length > 0 ? pick(rng, spots) : index);
                result.log.push(`A ${elite.name} came through the Portal.`);
            }
        }
    }

    /** Maybe telegraph an event for the next Advance. */
    function rollNextEvent() {
        // Weight 0: a global-only event, never rolled on one farm.
        const events = Object.values(ctx.events).filter((entry) => entry.weight > 0);
        if (events.length === 0 || state.turn + 1 < config.events.fromTurn || !rng.chance(config.events.chance)) return;
        let roll = rng.next() * events.reduce((sum, entry) => sum + entry.weight, 0);
        const next = events.find((entry) => (roll -= entry.weight) < 0) ?? events[events.length - 1]!;
        state.nextEvent = next.id;
        result.log.push(`Coming next turn: ${next.name}.`);
    }

    /** Does `mutation`'s recipe hold around the empty tile at `index`, in this weather, with these events on? */
    function recipeHolds(index: number, mutation: MutationDef, weather: GeoFarmWeather, events: (string | undefined)[]): boolean {
        const recipe = mutation.recipe;
        const tile = state.tiles[index]!;
        const nearby = around(state, index, 1);
        if (recipe.weather && recipe.weather !== weather) return false;
        if (recipe.event && !events.includes(recipe.event)) return false;
        if (recipe.minFertility !== undefined && tile.fertility < recipe.minFertility) return false;
        if (recipe.structure && !nearby.some((at) => state.tiles[at]!.structure?.structureId === recipe.structure)) return false;
        if (recipe.soil && soilOf(tile) !== recipe.soil) return false;
        if (recipe.pest) {
            const pestId = recipe.pest;
            const near =
                state.pests.some((pest) => pest.pestId === pestId && (pest.tile === index || nearby.includes(pest.tile))) ||
                nearby.some((at) => state.tiles[at]!.structure?.caged === pestId);
            if (!near) return false;
        }
        const ripeAround = (cropId: string) =>
            nearby.filter((at) => {
                const crop = state.tiles[at]!.crop;
                return crop?.cropId === cropId && isRipe(crop, cropDef(crop));
            }).length;
        return recipe.parents.every((parent) => ripeAround(parent.cropId) >= parent.count);
    }

    /** Every empty tile whose surroundings meet a recipe rolls for that mutation; at most one sprouts per tile. */
    function sproutMutations(weather: GeoFarmWeather, sheltered: Set<number>, event: FarmEventDef | undefined, ring: number | null) {
        const global = ctx.globalEvent;
        const meteor = [event, global].find((entry) => entry?.effect.kind === "meteor-shower");
        const recipes = Object.values(ctx.mutations);
        const beehives = structuresOf("beehive");
        const hiveBoost = Math.max(1, ...beehives.map(({ def }) => (def.effect.kind === "beehive" ? def.effect.boost : 1)));
        for (const [index, tile] of state.tiles.entries()) {
            const pollinated = tile.pollinated;
            tile.pollinated = false;
            // Wild outcomes happen in the open field, never under glass.
            if (!tile.owned || tile.crop || tile.structure || tile.waste || sheltered.has(index)) continue;
            const nearby = around(state, index, 1);
            const hived = beehives.some((hive) => hive.index === index || nearby.includes(hive.index));
            for (const mutation of recipes) {
                if (!recipeHolds(index, mutation, weather, [event?.id, global?.id])) continue;
                const ringBoost = ring === index && event?.effect.kind === "fairy-ring" ? event.effect.mutationBoost : 1;
                const meteorBoost = meteor?.effect.kind === "meteor-shower" ? meteor.effect.mutationBoost : 1;
                const wasteBoost = nearby.some((at) => state.tiles[at]!.waste) ? config.waste.mutationBoost : 1;
                const boost =
                    (pollinated ? config.pollinateBoost : 1) * (hived ? hiveBoost : 1) * ringBoost * meteorBoost * wasteBoost * (blessed("mutation") ? 2 : 1);
                if (!rng.chance(Math.min(1, mutation.chance * boost))) continue;
                tile.crop = { cropId: mutation.id, stage: 0, ripeTurns: 0, held: false, rotten: false };
                result.log.push(`Something strange has sprouted at ${tileName(index)}: ${mutation.name}!`);
                break;
            }
        }
    }

    /** Maybe one new pest, drawn by the crops it likes, next to one of them. */
    /** `boost` scales the chance; `forced` (a swarm) skips the chance, the cap and the grace turns. */
    function spawnPest(sheltered: Set<number>, boost: number, forced: boolean) {
        // The Curse of Hunger brings them before their time.
        const fromTurn = blessed("pests") ? 0 : config.pests.fromTurn;
        if (!forced && (state.turn < fromTurn || state.pests.length >= config.pests.max)) return;
        // Tiles that draw a pest: a crop it likes, or a soil it likes.
        const growing = (def: PestDef) =>
            state.tiles.flatMap((tile, index) => {
                if (!tile.owned || tile.structure) return [];
                const crop = tile.crop && !tile.crop.rotten && def.likes.includes(tile.crop.cropId);
                return crop || def.soils?.includes(soilOf(tile)) ? [index] : [];
            });
        const draws = Object.values(ctx.pests)
            .filter((def) => def.weight > 0)
            .map((def) => ({ def, tiles: growing(def) }))
            .filter((draw) => draw.tiles.length > 0);
        const liked = draws.reduce((sum, draw) => sum + draw.tiles.length, 0);
        if (liked === 0) return;
        if (!forced && !rng.chance(Math.min(config.pests.maxChance, config.pests.chancePerCrop * liked * boost))) return;

        // A Jukebox's tune makes its pest likelier to be the one that comes.
        const tuned = (def: PestDef) =>
            structuresOf("jukebox").reduce((boost, { structure, def: jukebox }) => (structure.tune === def.id && jukebox.effect.kind === "jukebox" ? boost * jukebox.effect.boost : boost), 1);
        const weightOf = (draw: (typeof draws)[number]) => draw.def.weight * draw.tiles.length * tuned(draw.def);
        let roll = rng.next() * draws.reduce((sum, draw) => sum + weightOf(draw), 0);
        const draw = draws.find((entry) => (roll -= weightOf(entry)) < 0) ?? draws[draws.length - 1]!;
        const near = pick(rng, draw.tiles);
        const taken = new Set(state.pests.map((pest) => pest.tile));
        const open = around(state, near, 1).filter(
            (index) => !state.tiles[index]!.crop && !state.tiles[index]!.structure && !taken.has(index) && !sheltered.has(index),
        );
        if (open.length === 0 && sheltered.has(near)) return;
        const tile = open.length > 0 ? pick(rng, open) : near;
        newPest(draw.def, tile);
        pestNotes.push(`A ${draw.def.name} has come for the ${draw.def.likes.map((id) => crops[id]?.name ?? id).join(" and ")}.`);
    }
}
