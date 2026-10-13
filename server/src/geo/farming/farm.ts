import type { GeoFarmAction, GeoFarmGain, GeoFarmWeather } from "@cozy/shared/geo";
import { GEO_FARM_MAX_FERTILITY, GEO_FARM_MAX_MOISTURE, GEO_FARM_SIZE, GEO_FARM_WEATHERS } from "@cozy/shared/geo";
import { FARMING_CARDS, isFarmingCardId, type CropDef, type FarmingCardId } from "../content/farming";
import type { FarmingConfig } from "../content/models";
import { createRng, type Rng } from "../engine/rng";

/**
 * The farming rules: pure and seeded, like fishing and combat. Each step
 * takes the stored farm and returns the next, plus what the repository must
 * save alongside it in the same transaction (a seed out of the bag, a card's
 * charge, the harvest, coins for a tile).
 *
 * Nothing grows on the clock: the clock only banks Farm Turns (`accrue`),
 * and the farm moves when the player spends one on Advance.
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
};

/** Everything a farm keeps, in `geo.farms.state`. */
export type FarmState = {
    version: 1;
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
    /** Read the Sky: the long forecast shows until the next Advance. */
    skyRead: boolean;
    /** Tiles bought so far, for the next one's price. */
    unlocked: number;
};

export type FarmHandCard = { inventoryId: string; itemId: string; cardId: string; chargesLeft: number };
export type FarmSeedSlot = { slot: number; itemId: string; quantity: number };

/** What a step needs besides the farm, loaded by the repository. */
export type FarmContext = {
    crops: Record<string, CropDef>;
    config: FarmingConfig;
    hand: FarmHandCard[];
    seedBag: FarmSeedSlot[];
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

/** A new farm: a startSize square of Normal soil in the middle, everything else locked. */
export function newFarm(config: FarmingConfig, seed: number, weatherSeed: number, now: Date): FarmState {
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
        };
    });
    return {
        version: 1,
        seed,
        weatherSeed,
        tiles,
        turn: 0,
        labor: config.laborPerTurn,
        turnsBanked: config.startTurnsBanked,
        accruedAt: now.toISOString(),
        skyRead: false,
        unlocked: 0,
    };
}

/** Banks the Farm Turns that came in since the last look. Pure: returns a new state. */
export function accrue(state: FarmState, config: FarmingConfig, now: Date): FarmState {
    const period = config.turnHours * HOUR_MS;
    if (state.turnsBanked >= config.maxTurnsBanked) return { ...state, accruedAt: now.toISOString() };
    const since = new Date(state.accruedAt).getTime();
    const gained = Math.floor(Math.max(0, now.getTime() - since) / period);
    if (gained === 0) return state;
    const banked = Math.min(config.maxTurnsBanked, state.turnsBanked + gained);
    // A full bank stops the clock; it starts again from the next Advance.
    const accruedAt = banked >= config.maxTurnsBanked ? now : new Date(since + gained * period);
    return { ...state, turnsBanked: banked, accruedAt: accruedAt.toISOString() };
}

/** When the next Farm Turn comes in, or null while the bank is full. */
export function nextTurnAt(state: FarmState, config: FarmingConfig): Date | null {
    if (state.turnsBanked >= config.maxTurnsBanked) return null;
    return new Date(new Date(state.accruedAt).getTime() + config.turnHours * HOUR_MS);
}

/** PLACEHOLDER weather: turn n's weather, rolled from the farm's weather seed. */
export function weatherAt(state: FarmState, config: FarmingConfig, turn: number): GeoFarmWeather {
    const roll = createRng((state.weatherSeed ^ Math.imul(turn, 0x9e3779b1)) >>> 0).next();
    const weights = GEO_FARM_WEATHERS.map((weather) => config.weatherWeights[weather]);
    let pick = roll * weights.reduce((sum, weight) => sum + weight, 0);
    for (const [i, weather] of GEO_FARM_WEATHERS.entries()) {
        pick -= weights[i]!;
        if (pick < 0) return weather;
    }
    return "clear";
}

/** The weather of the coming Advances: one, or three after Read the Sky. */
export function forecast(state: FarmState, config: FarmingConfig): GeoFarmWeather[] {
    const length = state.skyRead ? 3 : 1;
    return Array.from({ length }, (_, i) => weatherAt(state, config, state.turn + 1 + i));
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

export const isRipe = (crop: FarmCrop, def: CropDef) => !crop.rotten && crop.stage >= def.stages;

/** Chance a crop rots on the next Advance: only ripe, unheld crops can. */
export function rotChance(crop: FarmCrop, def: CropDef, config: FarmingConfig): number {
    if (!isRipe(crop, def) || crop.held) return 0;
    const chances = config.rotChances;
    return chances[Math.min(crop.ripeTurns, chances.length - 1)]!;
}

const between = (rng: Rng, { min, max }: { min: number; max: number }) => min + Math.floor(rng.next() * (max - min + 1));

/**
 * One step. Throws FarmRuleError for anything the player can't do now (not
 * enough Labor, no turns banked, a tile that isn't theirs…).
 */
export function stepFarm(prev: FarmState, action: GeoFarmAction, ctx: FarmContext): FarmStepResult {
    const state: FarmState = structuredClone(prev);
    const rng = createRng(state.seed);
    const result: FarmStepResult = { state, log: [], gains: [], xp: 0, seedUsed: null, cardPlayed: null, coins: 0 };
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
    const cropDef = (crop: FarmCrop) => {
        const def = crops[crop.cropId];
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
        const seeds = between(rng, def.seedsBack);
        gain(def.produce, amount);
        gain(def.seed, seeds);
        result.xp += def.xp;
        tile.crop = null;
        tile.fertility = Math.max(0, tile.fertility - def.fertilityCost);
        result.log.push(`Harvested ${amount} ${def.name} at ${tileName(index)}${seeds > 0 ? ` and ${seeds} seeds` : ""}.`);
    };
    const ripeAt = (index: number) => {
        const crop = ownedTile(index).crop;
        if (!crop || crop.rotten) throw new FarmRuleError(crop ? "It's rotten. Clear it." : "Nothing grows there");
        if (!isRipe(crop, cropDef(crop))) throw new FarmRuleError("It isn't ripe yet");
        return crop;
    };

    switch (action.type) {
        case "plant": {
            const tile = ownedTile(action.tile);
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
                tile.fertility = Math.min(GEO_FARM_MAX_FERTILITY, tile.fertility + 3);
                result.log.push(`Dug the ${name} at ${tileName(index)} back in: +3 fertility.`);
                return;
            }
            case "farm.read-sky": {
                state.skyRead = true;
                result.log.push("You read the sky: three turns of weather ahead.");
                return;
            }
        }
    }

    /** Everything moves on one turn: weather, growth, ripe crops' push-your-luck, fallow soil. */
    function advance() {
        const weather = weatherAt(state, config, state.turn + 1);
        state.turn += 1;
        state.turnsBanked -= 1;
        state.labor = config.laborPerTurn;
        state.skyRead = false;

        let grew = 0;
        let dry = 0;
        const notes: string[] = [];
        for (const [index, tile] of state.tiles.entries()) {
            if (!tile.owned) continue;
            if (weather === "rain") tile.moisture = Math.min(GEO_FARM_MAX_MOISTURE, tile.moisture + 2);
            if (weather === "heatwave") tile.moisture = Math.max(0, tile.moisture - 1);

            const crop = tile.crop;
            if (!crop) {
                if (tile.fertility < config.fallowCap) tile.fertility = Math.min(config.fallowCap, tile.fertility + config.fallowRecovery);
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
                } else if (tile.soakTurns > 0 || weather === "overcast" || tile.moisture > 0) {
                    // Soaked tiles and overcast skies cost no water.
                    if (tile.soakTurns === 0 && weather !== "overcast") tile.moisture -= 1;
                    crop.stage += 1;
                    grew += 1;
                    if (isRipe(crop, def)) notes.push(`The ${def.name} at ${tileName(index)} is ripe.`);
                } else {
                    dry += 1;
                }
            }
            if (tile.soakTurns > 0) tile.soakTurns -= 1;
        }

        const label = weather === "heatwave" ? "Heatwave" : weather[0]!.toUpperCase() + weather.slice(1);
        result.log.push(`Turn ${state.turn}: ${label}. ${grew} crop${grew === 1 ? "" : "s"} grew${dry ? `, ${dry} too dry to grow` : ""}.`);
        result.log.push(...notes);
    }
}
