import type { GeoHandCard, GeoLunchboxSlot } from "./run.contract";

/**
 * Farming: one grid per player that grows only when they spend a Farm Turn.
 * Turns come in on the clock (1 per 12h, a few banked); each gives Labor to
 * spend on watering, harvesting and farming cards, and Advance moves every
 * crop on. The server runs every rule; the app shows what it says.
 *
 * The farm can be looked at (and planned on, with blueprints) anywhere, but
 * only worked at a farming place.
 */

/** The farm is a square this many tiles across; tiles are unlocked one at a time. */
export const GEO_FARM_SIZE = 9;

/** PLACEHOLDER weather until real local weather: rolled per turn from the farm's seed. */
export const GEO_FARM_WEATHERS = ["clear", "overcast", "rain", "heatwave"] as const;
export type GeoFarmWeather = (typeof GEO_FARM_WEATHERS)[number];

/** What a farming card aims at, so the app can preview it on the grid. */
export type GeoFarmCardShape = "tile" | "row" | "square3" | "none";

/** A crop growing (or rotting) on a tile. */
export type GeoFarmCrop = {
    cropId: string;
    /** 0 = just planted; ripe at `stages`. */
    stage: number;
    stages: number;
    ripe: boolean;
    /** Advances it has sat ripe: each adds yield and risks rot. */
    ripeTurns: number;
    /** Chance it rots on the next Advance, 0–1. 0 while held or growing. */
    rotChance: number;
    /** Held: the next Advance neither rots nor improves it. */
    held: boolean;
    rotten: boolean;
};

export type GeoFarmTile = {
    /** 0 … GEO_FARM_SIZE² − 1, row by row. */
    index: number;
    x: number;
    y: number;
    owned: boolean;
    /** Locked, but next to an owned tile: can be bought now. */
    unlockable: boolean;
    crop: GeoFarmCrop | null;
    /** 0–GEO_FARM_MAX_MOISTURE. A growing crop drinks 1 per Advance and doesn't grow without it. */
    moisture: number;
    /** Turns left in which growing here drinks nothing. */
    soakTurns: number;
    /** 0–10. Harvests drain it; empty tiles recover. Low = smaller harvests, high = bigger. */
    fertility: number;
    /** The planned crop: a faded ghost, nothing more. */
    blueprint: string | null;
};

export const GEO_FARM_MAX_MOISTURE = 3;
export const GEO_FARM_MAX_FERTILITY = 10;

/** A crop as the app needs it to plant, plan and draw. */
export type GeoCropView = {
    id: string;
    name: string;
    icon: string;
    seedItemId: string;
    produceItemId: string;
    stages: number;
};

/** One farming card in hand, with what it costs and aims at. */
export type GeoFarmHandCard = GeoHandCard & {
    labor: number;
    shape: GeoFarmCardShape;
};

/** Items a farm action put in the inventory. */
export type GeoFarmGain = { itemId: string; quantity: number };

export type GeoFarmView = {
    size: number;
    tiles: GeoFarmTile[];
    /** Farm Turns played so far. */
    turn: number;
    labor: number;
    laborPerTurn: number;
    /** Turns waiting to be spent; Advance spends one. */
    turnsBanked: number;
    maxTurnsBanked: number;
    /** When the next turn comes in; null while the bank is full. */
    nextTurnAt: string | null;
    /** Weather for the coming Advances, soonest first. One unless the sky has been read. */
    forecast: GeoFarmWeather[];
    /** Coins the next tile costs; null when every tile is owned. */
    unlockCost: number | null;
    hand: GeoFarmHandCard[];
    /** The Seed Bag: slots unlocked and what's packed. Planting takes one seed. */
    seedBag: GeoSeedBag;
    crops: GeoCropView[];
    /** What the last action did, in order. */
    log: string[];
    /** What the last action put in the inventory. */
    gained: GeoFarmGain[];
    /** Farming XP the last action gave. */
    xpGained: number;
};

/**
 * Seeds packed for farming, slotted like the bait bag: a stack of one seed
 * per slot, no seed in two slots, and packed seeds have left the inventory.
 */
export type GeoSeedBag = {
    slots: number;
    contents: GeoLunchboxSlot[];
};

export const GEO_SEED_BAG_MAX_SLOTS = 4;
/** PLACEHOLDER. */
export const GEO_SEED_BAG_STACK_SIZE = 50;

/** `PUT /geo/me/seed-bag/:slot`: the slot now holds this many of this seed. */
export type GeoPackSeedsRequest = { itemId: string; quantity: number };

/**
 * `POST /geo/farm/actions`. Work (everything but `blueprint`) needs the
 * player at a farming place; `blueprint` is planning and works anywhere.
 */
export type GeoFarmAction =
    /** Free: takes one seed from the Seed Bag slot. */
    | { type: "plant"; tile: number; slot: number }
    /** 1 Labor: +1 moisture. */
    | { type: "water"; tile: number }
    /** 1 Labor: a ripe crop into the inventory. */
    | { type: "harvest"; tile: number }
    /** 1 Labor: pulls up whatever is there, rotten or not, for nothing. */
    | { type: "clear"; tile: number }
    /** A farming card at a tile (any tile for shape "none"). */
    | { type: "play"; inventoryId: string; tile: number }
    /** Spends a Farm Turn: everything grows, Labor refills. */
    | { type: "advance" }
    /** Coins: a locked tile next to the farm. */
    | { type: "unlock"; tile: number }
    /** The plan: a ghost crop on a tile, or null to clear it. */
    | { type: "blueprint"; tile: number; cropId: string | null };

export const GEO_FARM_ACTION_TYPES = [
    "plant",
    "water",
    "harvest",
    "clear",
    "play",
    "advance",
    "unlock",
    "blueprint",
] as const satisfies readonly GeoFarmAction["type"][];
