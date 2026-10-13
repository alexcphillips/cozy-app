import type { GeoFarmCardShape, GeoFarmWeather } from "@cozy/shared/geo";

/**
 * Farming's types and ids. The crops are `data/crops/`, the mutations
 * `data/mutations/`, the pests `data/pests/`, the structures `data/structures/`, the cards
 * `data/cards/farming/`, and every tuning number `data/config/farming.ts`.
 *
 * Like fishing, farming cards are hard-coded rules (`farming/farm.ts`) keyed
 * by card id until the farm has engine effects of its own, so every farming
 * card file must be one of FARMING_CARDS (checked at boot). Labor and shape
 * live here, beside the rules, so the app can price and preview a card.
 */

export type CropDef = {
    id: string;
    name: string;
    icon: string;
    seed: string;
    produce: string;
    stages: number;
    yield: { min: number; max: number };
    seedsBack: { min: number; max: number };
    fertilityCost: number;
    xp: number;
};

/** What has to be true around an empty tile on Advance for a mutation to roll there. */
export type MutationRecipe = {
    parents: { cropId: string; count: number }[];
    weather?: GeoFarmWeather;
    pest?: string;
    minFertility?: number;
};

/** A fantasy crop that only sprouts from a recipe. Grows and harvests like a crop, with no seeds. */
export type MutationDef = {
    id: string;
    name: string;
    icon: string;
    description: string;
    produce: string;
    stages: number;
    yield: { min: number; max: number };
    fertilityCost: number;
    xp: number;
    recipe: MutationRecipe;
    chance: number;
    research: { coins: number; xp: number };
};

/** Anything that grows on a tile: a crop, or a mutation (no seed). */
export type GrowsDef = CropDef | MutationDef;

/** What a structure does on the farm; the rules are in `farming/farm.ts`. */
export type StructureEffect =
    /** Its tune makes that pest `boost` times likelier to be the one that spawns. */
    | { kind: "jukebox"; boost: number }
    /** Keeps one pest alive: it counts as that pest nearby for mutation recipes. */
    | { kind: "cage" }
    /** Mutation chances × `boost` on the tiles around; each Advance, `swarmChance` the crops around don't grow. */
    | { kind: "beehive"; boost: number; swarmChance: number }
    /** Every harvest and clear adds 1 compost, up to `capacity`; each Advance spends 1 for +1 fertility around. */
    | { kind: "compost"; capacity: number }
    /** Keeps the 4 tiles beside it at 1 water or more, and its frog eats 1 pest on or around it each Advance. */
    | { kind: "pond" }
    /** Shelters the 8 tiles around: no weather there, no pests arrive there, no mutations sprout there. */
    | { kind: "greenhouse" };

export type StructureDef = {
    id: string;
    name: string;
    icon: string;
    description: string;
    /** `structure.<id>`: the item placed and picked up. */
    itemId: string;
    effect: StructureEffect;
};

export const structureItemId = (id: string) => `structure.${id}`;

/** How a pest behaves on the grid; the rules are in `farming/farm.ts`. */
export type PestBehaviour =
    /** Eats a crop within `reach` tiles (on its own tile first), moving onto it. */
    | { kind: "eat"; reach: number }
    /** Drains `amount` fertility from its tile; moves on once the soil is spent. */
    | { kind: "drain"; amount: number }
    /** Saps the crop it's on; every `every` Advances, breeds onto a next-door crop. */
    | { kind: "breed"; every: number };

export type PestDrop = { itemId: string; chance: number; quantity: { min: number; max: number } };

export type PestDef = {
    id: string;
    name: string;
    icon: string;
    description: string;
    likes: string[];
    behaviour: PestBehaviour;
    weight: number;
    drops: PestDrop[];
    xp: number;
};

/** The farming cards whose rules exist in `farming/farm.ts`, with their Labor and shape. */
export const FARMING_CARDS = {
    /** Water every owned tile in the row. */
    "farm.bucket-line": { labor: 1, shape: "row" },
    /** Moisture to full, and growing drinks nothing for 2 turns. */
    "farm.deep-soak": { labor: 2, shape: "tile" },
    /** Harvest one ripe crop with +1 yield. */
    "farm.careful-pick": { labor: 1, shape: "tile" },
    /** Harvest every ripe crop in a 3×3, each −1 yield. */
    "farm.scythe-sweep": { labor: 2, shape: "square3" },
    /** A growing crop moves one stage now; its tile loses 1 fertility. */
    "farm.ripen": { labor: 2, shape: "tile" },
    /** A ripe crop neither rots nor improves on the next Advance. */
    "farm.hold": { labor: 1, shape: "tile" },
    /** Turns whatever grows on the tile into +3 fertility. */
    "farm.green-manure": { labor: 1, shape: "tile" },
    /** The forecast shows 3 Advances until the next one. */
    "farm.read-sky": { labor: 1, shape: "none" },
    /** Clears every pest in a 3×3; ripe crops in it lose their waiting bonus. */
    "farm.smoke": { labor: 2, shape: "square3" },
    /** Pulls every pest in the 8 tiles around onto the middle one. */
    "farm.bait-ring": { labor: 1, shape: "ring" },
    /** Arms a tile: a pest moving onto it on the next Advance is caught. */
    "farm.snap-trap": { labor: 1, shape: "tile" },
    /** An empty tile's mutation odds go up on the next Advance; ripe crops around lose their wait. */
    "farm.hand-pollinate": { labor: 1, shape: "tile" },
} as const satisfies Record<string, { labor: number; shape: GeoFarmCardShape }>;

export type FarmingCardId = keyof typeof FARMING_CARDS;
export const FARMING_CARD_IDS = Object.keys(FARMING_CARDS) as FarmingCardId[];

export const isFarmingCardId = (id: string): id is FarmingCardId => Object.hasOwn(FARMING_CARDS, id);
