import type { GeoRole } from "@cozy/shared/geo";

/** Rows as pg returns them, snake_case. */

export type PlayerRow = {
    id: string;
    display_name: string;
    coins: string; // BIGINT arrives as a string
    role: GeoRole;
    created_at: Date;
};

export type InventoryRow = {
    id: string;
    player_id: string;
    item_id: string;
    quantity: number;
    charges_left: number | null;
    obtained_at: Date;
};

export type EquipmentRow = {
    slot: string;
    inventory_id: string;
};

export type TalismanBagRow = {
    item_id: string;
    inventory_id: string;
};

export type HandRow = {
    skill: string;
    inventory_ids: string[];
};

export type SavedHandRow = {
    id: string;
    skill: string;
    name: string;
    inventory_ids: string[];
    created_at: Date;
};

export type LunchboxRow = {
    slot: number;
    item_id: string;
    quantity: number;
};

/** A geo.bait row: the same shape as a lunchbox one. */
export type BaitRow = LunchboxRow;

export type SkillXpRow = {
    skill: string;
    xp: string; // BIGINT
};
