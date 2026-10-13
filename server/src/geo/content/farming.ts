import type { GeoFarmCardShape } from "@cozy/shared/geo";

/**
 * Farming's types and ids. The crops are `data/crops/`, the cards
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
} as const satisfies Record<string, { labor: number; shape: GeoFarmCardShape }>;

export type FarmingCardId = keyof typeof FARMING_CARDS;
export const FARMING_CARD_IDS = Object.keys(FARMING_CARDS) as FarmingCardId[];

export const isFarmingCardId = (id: string): id is FarmingCardId => Object.hasOwn(FARMING_CARDS, id);
