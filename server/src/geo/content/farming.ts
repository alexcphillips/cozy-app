import type { GeoFarmCardShape, GeoFarmSoil, GeoFarmWeather } from "@cozy/shared/geo";

/**
 * Farming's types and ids. The crops are `data/crops/`, the mutations
 * `data/mutations/`, the pests `data/pests/`, the structures `data/structures/`,
 * the farm events `data/farm-events/`, the cards
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

/** What has to be true around an empty tile each turn for a mutation to roll there. */
export type MutationRecipe = {
    parents: { cropId: string; count: number }[];
    weather?: GeoFarmWeather;
    event?: string;
    pest?: string;
    minFertility?: number;
    structure?: string;
    soil?: GeoFarmSoil;
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

/** What a farm event does; the rules are in `farming/farm.ts`. */
export type FarmEventEffect =
    /** On its turn: `count` extra pests arrive, past the usual cap. */
    | { kind: "pest-swarm"; count: number }
    /** On its turn: a ring of mushrooms round an empty tile: +`fertility` on the 8 around, and that tile's mutation chances × `mutationBoost`. */
    | { kind: "fairy-ring"; fertility: number; mutationBoost: number }
    /** On its turn: recipes can need it, and pests are `pestBoost` × likelier to come. */
    | { kind: "blood-moon"; pestBoost: number }
    /** For the turn after it comes: every harvest +`bonus` yield. */
    | { kind: "bumper-harvest"; bonus: number }
    /** For the turn after it comes: `count` of `stock` are for sale. */
    | { kind: "merchant"; count: number; stock: { itemId: string; price: number }[] }
    /** On its turn: mutation chances × `mutationBoost`, and each empty tile has `dropChance` of `itemId` falling on it. */
    | { kind: "meteor-shower"; mutationBoost: number; dropChance: number; itemId: string };

export type FarmEventDef = {
    id: string;
    name: string;
    icon: string;
    description: string;
    /** How often it's the one rolled on a farm; 0 for a global-only event. */
    weight: number;
    effect: FarmEventEffect;
};

/** What a structure does on the farm; the rules are in `farming/farm.ts`. */
export type StructureEffect =
    /** Its tune makes that pest `boost` times likelier to be the one that spawns. */
    | { kind: "jukebox"; boost: number }
    /** Keeps one pest alive: it counts as that pest nearby for mutation recipes. */
    | { kind: "cage" }
    /** Mutation chances × `boost` on the tiles around; each turn, `swarmChance` the crops around don't grow. */
    | { kind: "beehive"; boost: number; swarmChance: number }
    /** Every harvest and clear adds 1 compost, up to `capacity`; each turn spends 1 for +1 fertility around. */
    | { kind: "compost"; capacity: number }
    /** Keeps the 4 tiles beside it at 1 water or more, and its frog eats 1 pest on or around it each turn. */
    | { kind: "pond" }
    /** Shelters the 8 tiles around: no weather there, no pests arrive there, no mutations sprout there. */
    | { kind: "greenhouse" }
    /** Crops within `radius` grow `growth` extra stages a turn; each turn, `wasteChance` waste lands within `radius`. */
    | { kind: "reactor"; radius: number; growth: number; wasteChance: number }
    /** Tear the Veil opens it: on the next turn, `wave` of `pests` come through, then it shuts. */
    | { kind: "portal"; wave: number; pests: string[] }
    /** Takes offerings: their NPC value buys a roll for a blessing (`config/farming.ts` `shrine`). */
    | { kind: "shrine" }
    /** Stores up to `capacity` water: rain adds `rain`, a storm `storm`, a heatwave takes `heatwave`. Plain watering draws on it for no Labor. */
    | { kind: "well"; capacity: number; rain: number; storm: number; heatwave: number }
    /** Storms can't flatten crops within `radius`. Recipes can need one nearby. */
    | { kind: "lightning-rod"; radius: number };

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
    /** Saps the crop it's on; every `every` turns, breeds onto a next-door crop. */
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
    /** Hits it takes to clear; 1 unless elite. */
    hp: number;
    /** Soils it's drawn to, as if they were crops it likes. */
    soils?: GeoFarmSoil[];
    drops: PestDrop[];
    xp: number;
    /** Pesthunter points for turning it in from a Pest Cage. */
    bounty: number;
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
    /** A ripe crop neither rots nor improves on the next turn. */
    "farm.hold": { labor: 1, shape: "tile" },
    /** Turns whatever grows on the tile into +3 fertility. */
    "farm.plow-under": { labor: 1, shape: "tile" },
    /** The forecast shows 3 turns until the next one. */
    "farm.read-sky": { labor: 1, shape: "none" },
    /** Clears every pest in a 3×3; ripe crops in it lose their waiting bonus. */
    "farm.smoke": { labor: 2, shape: "square3" },
    /** Pulls every pest in the 8 tiles around onto the middle one. */
    "farm.bait-ring": { labor: 1, shape: "ring" },
    /** Arms a tile: a pest moving onto it on the next turn is caught. */
    "farm.snap-trap": { labor: 1, shape: "tile" },
    /** Scrubs nuclear waste off one tile. */
    "farm.hazmat-scrub": { labor: 1, shape: "tile" },
    /** Waste on the 4 tiles beside the aimed one (not the middle), killing what grows there. */
    "farm.controlled-leak": { labor: 2, shape: "cross" },
    /** Tears a Portal open: elite pests come through on the next turn. */
    "farm.tear-the-veil": { labor: 2, shape: "tile" },
    /** An empty tile rolls the mutations whose recipes hold there now, at half chance; a miss costs it 2 fertility. */
    "farm.coax": { labor: 2, shape: "tile" },
    /** +2 fertility on a tile and the 4 beside it, spending 2 compost from a Compost Bin. */
    "farm.compost-spread": { labor: 1, shape: "tile" },
    /** A 3×3's fertility can't drop until the next turn is done; crops in it don't grow on it. */
    "farm.lime-dust": { labor: 1, shape: "square3" },
    /** The next turn comes under a Blood Moon. */
    "farm.moon-rite": { labor: 2, shape: "none" },
    /** The next 3 pests cleared roll their drops twice. */
    "farm.exterminators-oath": { labor: 2, shape: "none" },
    /** The next order delivery counts one crop more. */
    "farm.rush-order": { labor: 1, shape: "none" },
    /** Every waste tile: 30% it turns into a random mutation, else a Glow Beetle crawls out. */
    "farm.chain-reaction": { labor: 3, shape: "none" },
    /** The row counts as Boggy for 2 turns. */
    "farm.mulch": { labor: 1, shape: "row" },
    /** One tile counts as Cursed for 1 turn. */
    "farm.hex-the-earth": { labor: 1, shape: "tile" },
    /** An empty tile's mutation odds go up on the next turn; ripe crops around lose their wait. */
    "farm.hand-pollinate": { labor: 1, shape: "tile" },
} as const satisfies Record<string, { labor: number; shape: GeoFarmCardShape }>;

export type FarmingCardId = keyof typeof FARMING_CARDS;
export const FARMING_CARD_IDS = Object.keys(FARMING_CARDS) as FarmingCardId[];

export const isFarmingCardId = (id: string): id is FarmingCardId => Object.hasOwn(FARMING_CARDS, id);
