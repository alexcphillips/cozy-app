import type { GeoFarmAction, GeoFarmGain, GeoFarmPestIntent, GeoFarmWeather } from "@cozy/shared/geo";
import { GEO_FARM_MAX_FERTILITY, GEO_FARM_MAX_MOISTURE, GEO_FARM_SIZE, GEO_FARM_WEATHERS } from "@cozy/shared/geo";
import {
    FARMING_CARDS,
    isFarmingCardId,
    type CropDef,
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
};

export type FarmStructure = {
    structureId: string;
    /** Jukebox: the pest whose tune plays. */
    tune: string | null;
    /** Pest Cage: the pest kept inside. */
    caged: string | null;
    /** Compost Bin: compost waiting. */
    compost: number;
};

export type FarmPest = {
    id: number;
    pestId: string;
    tile: number;
    /** Advances it has lived through. */
    age: number;
    /** What it does on the next Advance. */
    intent: GeoFarmPestIntent;
};

/** Everything a farm keeps, in `geo.farms.state`. */
export type FarmState = {
    version: 5;
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
};

/** A farm as an older version saved it: the fields added since may be missing. */
export type StoredFarm = Omit<FarmState, "version" | "tiles" | "pests" | "nextPestId" | "lab" | "turnWeather" | "home"> &
    Partial<Pick<FarmState, "pests" | "nextPestId" | "lab" | "turnWeather" | "home">> & {
        version: number;
        tiles: (Omit<FarmTile, "trap" | "pollinated" | "structure"> & Partial<FarmTile>)[];
    };

/**
 * A farm saved by an older version (1: before pests, 2: before mutations,
 * 3: before structures, 4: before real weather), brought up to date.
 */
export function upgradeFarm(stored: StoredFarm): FarmState {
    if (stored.version === 5) return stored as FarmState;
    return {
        ...stored,
        version: 5,
        // Turns banked before real weather play seeded rolls (the gap filler).
        turnWeather: stored.turnWeather ?? [],
        home: stored.home ?? null,
        tiles: stored.tiles.map((tile) => ({
            ...tile,
            trap: tile.trap ?? false,
            pollinated: tile.pollinated ?? false,
            structure: tile.structure ?? null,
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
    config: FarmingConfig;
    now: Date;
    hand: FarmHandCard[];
    seedBag: FarmSeedSlot[];
    /** How many of each item the player holds (structures are placed from these). */
    held: Record<string, number>;
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
    /** Items the step takes from the inventory (a structure placed). */
    itemsUsed: GeoFarmGain[];
};

const N = GEO_FARM_SIZE;
const HOUR_MS = 3_600_000;

export const tileXY = (index: number) => ({ x: index % N, y: Math.floor(index / N) });
const indexOf = (x: number, y: number) => y * N + x;
const inGrid = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N;
const tileName = (index: number) => {
    const { x, y } = tileXY(index);
    return `(${x + 1}, ${y + 1})`;
};

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
        };
    });
    return {
        version: 5,
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
    const result: FarmStepResult = { state, log: [], gains: [], xp: 0, seedUsed: null, cardPlayed: null, coins: 0, itemsUsed: [] };
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
            tile.fertility <= config.fertilityYield.low ? -1 : tile.fertility >= config.fertilityYield.high ? 1 : 0;
        const pushBonus = Math.min(crop.ripeTurns, config.rotChances.length);
        const amount = Math.max(1, between(rng, def.yield) + pushBonus + fertilityBonus + bonus);
        // Mutations give no seeds back.
        const seeds = "seed" in def ? between(rng, def.seedsBack) : 0;
        gain(def.produce, amount);
        if ("seed" in def) gain(def.seed, seeds);
        result.xp += def.xp;
        tile.crop = null;
        tile.fertility = Math.max(0, tile.fertility - def.fertilityCost);
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
        for (const drop of def.drops) if (rng.chance(drop.chance)) gain(drop.itemId, between(rng, drop.quantity));
        result.xp += def.xp;
        log.push(`${how} the ${def.name} at ${tileName(pest.tile)}.`);
    };
    const pestsOn = (tiles: Set<number>) => state.pests.filter((pest) => tiles.has(pest.tile));

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
            spendLabor(config.labor.water);
            tile.moisture += 1;
            result.log.push(`Watered ${tileName(action.tile)}.`);
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
            for (const pest of here) clearPest(pest, "Swatted");
            break;
        }
        case "place": {
            const tile = noStructure(ownedTile(action.tile));
            if (tile.crop) throw new FarmRuleError("Clear the crop first");
            if (state.pests.some((pest) => pest.tile === action.tile)) throw new FarmRuleError("Deal with the pests there first");
            const def = Object.values(ctx.structures).find((entry) => entry.itemId === action.itemId);
            if (!def) throw new FarmRuleError("That isn't a farm structure");
            if ((ctx.held[action.itemId] ?? 0) < 1) throw new FarmRuleError(`You have no ${def.name}`);
            tile.structure = { structureId: def.id, tune: null, caged: null, compost: 0 };
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
            const pest = state.pests.find((entry) => entry.tile === action.tile);
            if (!pest) throw new FarmRuleError("No pest there");
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
                for (const pest of caught) clearPest(pest, "Smoked out");
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
        state.turn += 1;
        state.turnsBanked -= 1;
        state.labor = config.laborPerTurn;
        state.skyRead = false;

        frogsEat();
        const sapped = actPests();
        const infested = new Set(state.pests.map((pest) => pest.tile));

        let grew = 0;
        let dry = 0;
        const notes: string[] = [];

        // Greenhouses shelter the tiles around them: those grow as on a clear day.
        const sheltered = new Set(structuresOf("greenhouse").flatMap(({ index }) => around(state, index, 1)));
        const skyOver = (index: number): GeoFarmWeather => (sheltered.has(index) ? "clear" : weather);
        for (const [index, tile] of state.tiles.entries()) {
            if (!tile.owned) continue;
            const sky = skyOver(index);
            if (sky === "rain" || sky === "storm") tile.moisture = Math.min(GEO_FARM_MAX_MOISTURE, tile.moisture + 2);
            if (sky === "heatwave") tile.moisture = Math.max(0, tile.moisture - 1);
            const crop = tile.crop;
            if (!crop || crop.rotten) continue;
            if (sky === "storm" && rng.chance(config.weather.stormFlattenChance)) {
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
        for (const { index, def } of structuresOf("beehive")) {
            if (def.effect.kind !== "beehive" || !rng.chance(def.effect.swarmChance)) continue;
            for (const at of around(state, index, 1)) sapped.add(at);
            notes.push(`The bees swarmed at ${tileName(index)}: the crops around won't grow this turn.`);
        }
        for (const [index, tile] of state.tiles.entries()) {
            if (!tile.owned) continue;

            const crop = tile.crop;
            if (!crop) {
                // Soil with a pest or a structure on it doesn't rest.
                if (tile.fertility < config.fallowCap && !infested.has(index) && !tile.structure) tile.fertility = Math.min(config.fallowCap, tile.fertility + config.fallowRecovery);
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
                } else if (sapped.has(index) || skyOver(index) === "frost") {
                    // Sapped or frozen: no growth, and no water drunk.
                } else if (tile.soakTurns > 0 || skyOver(index) === "overcast" || tile.moisture > 0) {
                    // Soaked tiles and overcast skies cost no water.
                    if (tile.soakTurns === 0 && skyOver(index) !== "overcast") tile.moisture -= 1;
                    crop.stage += 1;
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

        sproutMutations(weather, sheltered);
        spawnPest(sheltered);
        for (const pest of state.pests) pest.intent = planIntent(state, pest, pestDef(pest), rng);
    }

    /** Each Pond's frog eats one pest on or around it, before pests act. No drops: the frog had them. */
    function frogsEat() {
        for (const { index } of structuresOf("pond")) {
            const reach = new Set([index, ...around(state, index, 1)]);
            const near = pestsOn(reach);
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
            clearPest(pest, "Snap Trap caught", pestNotes);
            return true;
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
                    tile.fertility = Math.max(0, tile.fertility - intent.amount);
                    break;
                case "sap":
                    sapped.add(pest.tile);
                    break;
                case "breed": {
                    sapped.add(pest.tile);
                    if (!state.tiles[intent.tile]?.owned) break;
                    const young: FarmPest = { id: state.nextPestId++, pestId: pest.pestId, tile: intent.tile, age: 0, intent: { kind: "move", tile: intent.tile } };
                    state.pests.push(young);
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

    /** Every empty tile whose surroundings meet a recipe rolls for that mutation; at most one sprouts per tile. */
    function sproutMutations(weather: GeoFarmWeather, sheltered: Set<number>) {
        const recipes = Object.values(ctx.mutations);
        const beehives = structuresOf("beehive");
        const cages = structuresOf("cage");
        const hiveBoost = Math.max(1, ...beehives.map(({ def }) => (def.effect.kind === "beehive" ? def.effect.boost : 1)));
        for (const [index, tile] of state.tiles.entries()) {
            const pollinated = tile.pollinated;
            tile.pollinated = false;
            // Wild outcomes happen in the open field, never under glass.
            if (!tile.owned || tile.crop || tile.structure || sheltered.has(index)) continue;
            const nearby = around(state, index, 1);
            const hived = beehives.some((hive) => hive.index === index || nearby.includes(hive.index));
            const ripeAround = (cropId: string) =>
                nearby.filter((at) => {
                    const crop = state.tiles[at]!.crop;
                    return crop?.cropId === cropId && isRipe(crop, cropDef(crop));
                }).length;
            const pestNear = (pestId: string) =>
                state.pests.some((pest) => pest.pestId === pestId && (pest.tile === index || nearby.includes(pest.tile))) ||
                cages.some((cage) => cage.structure.caged === pestId && nearby.includes(cage.index));
            for (const mutation of recipes) {
                const recipe = mutation.recipe;
                if (recipe.weather && recipe.weather !== weather) continue;
                if (recipe.minFertility !== undefined && tile.fertility < recipe.minFertility) continue;
                if (recipe.pest && !pestNear(recipe.pest)) continue;
                if (!recipe.parents.every((parent) => ripeAround(parent.cropId) >= parent.count)) continue;
                const boost = (pollinated ? config.pollinateBoost : 1) * (hived ? hiveBoost : 1);
                if (!rng.chance(Math.min(1, mutation.chance * boost))) continue;
                tile.crop = { cropId: mutation.id, stage: 0, ripeTurns: 0, held: false, rotten: false };
                result.log.push(`Something strange has sprouted at ${tileName(index)}: ${mutation.name}!`);
                break;
            }
        }
    }

    /** Maybe one new pest, drawn by the crops it likes, next to one of them. */
    function spawnPest(sheltered: Set<number>) {
        if (state.turn < config.pests.fromTurn || state.pests.length >= config.pests.max) return;
        const growing = (def: PestDef) =>
            state.tiles.flatMap((tile, index) => (tile.owned && tile.crop && !tile.crop.rotten && def.likes.includes(tile.crop.cropId) ? [index] : []));
        const draws = Object.values(ctx.pests).map((def) => ({ def, tiles: growing(def) })).filter((draw) => draw.tiles.length > 0);
        const liked = draws.reduce((sum, draw) => sum + draw.tiles.length, 0);
        if (liked === 0 || !rng.chance(Math.min(config.pests.maxChance, config.pests.chancePerCrop * liked))) return;

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
        state.pests.push({ id: state.nextPestId++, pestId: draw.def.id, tile, age: 0, intent: { kind: "move", tile } });
        pestNotes.push(`A ${draw.def.name} has come for the ${draw.def.likes.map((id) => crops[id]?.name ?? id).join(" and ")}.`);
    }
}
