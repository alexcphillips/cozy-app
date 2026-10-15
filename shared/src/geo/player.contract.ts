import type { GeoPlayer } from "./auth.contract";
import type { GeoEquipmentSlot } from "./content.contract";
import type { GeoSeedBag } from "./farming.contract";
import type { GeoLunchboxSlot } from "./run.contract";

/** One owned copy (or stack) of an item. */
export type GeoInventoryEntry = {
    id: string;
    itemId: string;
    quantity: number;
    /** Cards only; 0 = faded. */
    chargesLeft: number | null;
    /** Weapons and armour: its reforge id (`GeoReforgeView`), or null. */
    reforge: string | null;
    obtainedAt: string;
};

/** `GET /geo/me`: everything the app needs on launch. */
export type GeoMeResponse = {
    player: GeoPlayer;
    inventory: GeoInventoryEntry[];
    /** Slot → inventory entry id. */
    equipment: Partial<Record<GeoEquipmentSlot, string>>;
    talismanBag: GeoTalismanBag;
    /** Skill → inventory entry ids, in hand order. */
    hands: Record<string, string[]>;
    /** Skill → total XP. */
    skillXp: Record<string, number>;
    savedHands: GeoSavedHand[];
    lunchbox: GeoLunchbox;
    bait: GeoBait;
    /** Seeds packed for farming. */
    seedBag: GeoSeedBag;
};

/**
 * Food packed for Runs: each slot holds a stack of one food, and no food is in
 * two slots. Packed food has left the inventory (it can't be sold or crafted)
 * until it's unpacked or eaten. Can't change mid-Run.
 */
export type GeoLunchbox = {
    /** Slots unlocked: starts at 1, up to GEO_LUNCHBOX_MAX_SLOTS. */
    slots: number;
    contents: GeoLunchboxSlot[];
};

/** Most lunchbox slots a player can unlock. */
export const GEO_LUNCHBOX_MAX_SLOTS = 4;

/** Most of one food a lunchbox slot holds. PLACEHOLDER. */
export const GEO_LUNCHBOX_STACK_SIZE = 10;

/** `PUT /geo/me/lunchbox/:slot`: the slot now holds this many of this food. */
export type GeoPackLunchboxRequest = {
    itemId: string;
    quantity: number;
};

/**
 * Bait packed for fishing Runs, slotted like the lunchbox: each slot holds a
 * stack of one bait, no bait is in two slots, and packed bait has left the
 * inventory until it's unpacked or used.
 */
export type GeoBait = {
    /** Slots unlocked: starts at 1, up to GEO_BAIT_MAX_SLOTS. */
    slots: number;
    contents: GeoBaitSlot[];
};

/** One bait slot: a stack of one bait. Same shape as a lunchbox slot. */
export type GeoBaitSlot = GeoLunchboxSlot;

/** Most bait slots a player can unlock. */
export const GEO_BAIT_MAX_SLOTS = 4;

/** Most of one bait a slot holds: one goes per cast, so more than food. PLACEHOLDER. */
export const GEO_BAIT_STACK_SIZE = 25;

/** `PUT /geo/me/bait/:slot`: the slot now holds this many of this bait. */
export type GeoPackBaitRequest = GeoPackLunchboxRequest;

/**
 * Only talismans in the bag count in a fight, and it holds one copy of each.
 * One taken out stays in the inventory, inactive. Holds `pages` ×
 * GEO_TALISMAN_BAG_PAGE_SIZE.
 */
export type GeoTalismanBag = {
    /** Starts at 1; more are bought from a vendor. */
    pages: number;
    inventoryIds: string[];
};

/** Talismans per bag page: the app's 5 × 5 grid. */
export const GEO_TALISMAN_BAG_PAGE_SIZE = 25;

/** The error when adding to a full bag; the app shows it as a toast. */
export const GEO_TALISMAN_BAG_FULL = "Your Talisman Bag is full";

/** `PUT /geo/me/equipment/:slot`. null empties the slot. */
export type GeoEquipRequest = {
    inventoryId: string | null;
};

/** `PUT /geo/me/hands/:skill`. */
export type GeoSetHandRequest = {
    inventoryIds: string[];
};

export type GeoSavedHand = {
    id: string;
    skill: string;
    name: string;
    inventoryIds: string[];
    createdAt: string;
};

/** `POST /geo/me/saved-hands`: saves the skill's current hand under a name. */
export type GeoSaveHandRequest = {
    skill: string;
    name: string;
};

/** How many cards a hand holds. Matches the app's HAND_SIZE. */
export const GEO_HAND_SIZE = 6;
