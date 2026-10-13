import type { GeoRecipe } from "./crafting.contract";
import type { GeoQualityTier } from "./fishing.contract";

export type GeoRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type GeoEquipKind = "mainHand" | "offHand" | "head" | "chest" | "hands" | "legs" | "ring";

/** Equipment slot ids on the character screen; rings take any of four. */
export type GeoEquipmentSlot =
    | "mainHand"
    | "offHand"
    | "head"
    | "chest"
    | "hands"
    | "legs"
    | "ring1"
    | "ring2"
    | "ring3"
    | "ring4";

export const GEO_EQUIPMENT_SLOTS: readonly GeoEquipmentSlot[] = [
    "mainHand",
    "offHand",
    "head",
    "chest",
    "hands",
    "legs",
    "ring1",
    "ring2",
    "ring3",
    "ring4",
];

/** Which kind of item each slot takes. */
export function geoSlotKind(slot: GeoEquipmentSlot): GeoEquipKind {
    return slot.startsWith("ring") ? "ring" : (slot as GeoEquipKind);
}

export type GeoItemKind = "card" | "equipment" | "talisman" | "material" | "consumable" | "misc";

/** A label/value row on the item detail page, e.g. Defence · +6. */
export type GeoItemStat = { label: string; value: string };

/** An item as the app draws it. Rules (effects, modifiers) stay server-side. */
export type GeoItemView = {
    id: string;
    kind: GeoItemKind;
    name: string;
    /** A Game Icons name; the app falls back to a plain icon for one it lacks. */
    icon: string;
    rarity: GeoRarity;
    description: string;
    /** Stat modifiers as rows, then any extra rows the content gives. */
    stats: GeoItemStat[];
    /** Passive effects, as sentences. */
    effects: string[];
    /** Cards: the skill whose hand it goes in. Materials: its skill sub-tab. */
    skill?: string;
    /** Cards. */
    maxCharges?: number;
    /** Equipment. */
    slot?: GeoEquipKind;
    /** Equipment: names of the cards it makes available while worn. */
    unlocksCards?: string[];
    /** Consumables that are food: packable in the lunchbox and eaten in a Run. */
    food?: { tags: string[] };
    /** Consumables that are bait: packable in the bait slots and used in a fishing Run. */
    bait?: boolean;
    /** Seeds: the crop they grow into. Packable in the Seed Bag. */
    seedOf?: string;
    /** A quality catch's tier, e.g. a Silver Salmon. */
    quality?: GeoQualityTier;
    /** Account-bound: can't be traded, sold or listed, or used in crafting. */
    soulbound?: boolean;
    /** Fishing cards: whether playing it raises or lowers a catch's quality odds. */
    finesse?: "raises" | "lowers";
    /**
     * What an NPC pays for one, in coins: the lowest Market price per unit,
     * and the base of the Market's fees (`market.contract`).
     */
    sellValue: number;
};

/**
 * One way an item is normally obtained, besides crafting (recipes say that
 * themselves). New kinds (dungeon chests) join this union.
 */
export type GeoItemSource =
    | {
          kind: "enemy";
          itemId: string;
          /** The enemy's name, e.g. Giant Spider. */
          name: string;
          /** 0–1, per kill. */
          chance: number;
          quantity: number;
      }
    | {
          kind: "vendor";
          itemId: string;
          /** The vendor's name, e.g. Farmer. */
          name: string;
      };

/** `GET /geo/content`: every item definition, for names and icons; every recipe; every item source. */
export type GeoContentResponse = {
    items: GeoItemView[];
    recipes: GeoRecipe[];
    sources: GeoItemSource[];
};
