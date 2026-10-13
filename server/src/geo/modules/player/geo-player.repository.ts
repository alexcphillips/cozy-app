import type {
    GeoBait,
    GeoBaitSlot,
    GeoSeedBag,
    GeoDeathCause,
    GeoEquipmentSlot,
    GeoInventoryEntry,
    GeoLunchbox,
    GeoLunchboxSlot,
    GeoMeResponse,
    GeoPlayer,
    GeoSavedHand,
} from "@cozy/shared/geo";
import { geoSkillLevel } from "@cozy/shared/geo";
import { query } from "../../../db";
import { AppError } from "../../../http/AppError";
import { CONTENT } from "../../content";
import { isStackable } from "../../content/content.types";
import type { TxQuery } from "../../db/transaction";
import {
    ADD_COINS,
    EMPTY_COINS,
    INSERT_COIN_LEDGER,
    ADD_SKILL_XP,
    ADD_TO_STACK,
    CLEAR_SLOT,
    FIND_EQUIPMENT,
    FIND_HAND,
    FIND_HANDS,
    FIND_INVENTORY,
    FIND_INVENTORY_BY_IDS,
    FIND_PLAYER,
    FIND_SKILL_XP,
    INSERT_INVENTORY,
    SET_CHARGES,
    UNEQUIP_INVENTORY,
    UPSERT_EQUIPMENT,
    UPSERT_HAND,
    DELETE_SAVED_HAND,
    DELETE_TALISMAN_BAG,
    FIND_TALISMAN_BAG,
    FIND_TALISMAN_BAG_PAGES,
    LOCK_TALISMAN_BAG_PAGES,
    INSERT_TALISMAN_BAG,
    FIND_SAVED_HAND,
    FIND_SAVED_HANDS,
    INSERT_SAVED_HAND,
    DELETE_INVENTORY_ROW,
    DELETE_BAIT_SLOT,
    DELETE_SEED_BAG_SLOT,
    FIND_SEED_BAG,
    FIND_SEED_BAG_SLOTS,
    SET_SEED_BAG_SLOTS,
    UPSERT_SEED_BAG_SLOT,
    USE_LAST_SEED,
    USE_SEED,
    USE_BAIT,
    USE_LAST_BAIT,
    DELETE_LUNCHBOX_SLOT,
    FIND_BAIT,
    FIND_BAIT_SLOTS,
    FIND_LUNCHBOX,
    FIND_LUNCHBOX_SLOTS,
    EAT_FROM_LUNCHBOX,
    EAT_LAST_FROM_LUNCHBOX,
    UPSERT_BAIT_SLOT,
    UPSERT_LUNCHBOX_SLOT,
    FIND_USES,
    LOCK_FREE_ROWS_OF_ITEM,
    LOCK_PLAYER,
    LOCK_INVENTORY_ROW,
    RESTORE_INVENTORY_ROW,
    SPEND_COINS,
    TAKE_FROM_STACK,
} from "./geo-player.sql";
import type {
    BaitRow,
    EquipmentRow,
    HandRow,
    InventoryRow,
    LunchboxRow,
    PlayerRow,
    SavedHandRow,
    SkillXpRow,
    TalismanBagRow,
} from "./geo-player.types";

/** The default query, for reads outside a transaction. */
const db: TxQuery = query;

export function toPlayer(row: PlayerRow): GeoPlayer {
    return {
        id: row.id,
        displayName: row.display_name,
        coins: Number(row.coins),
        role: row.role,
        createdAt: row.created_at.toISOString(),
    };
}

export function toInventoryEntry(row: InventoryRow): GeoInventoryEntry {
    return {
        id: row.id,
        itemId: row.item_id,
        quantity: row.quantity,
        chargesLeft: row.charges_left,
        obtainedAt: row.obtained_at.toISOString(),
    };
}

export async function findPlayer(playerId: string, tx: TxQuery = db): Promise<GeoPlayer | null> {
    const [row] = await tx<PlayerRow>(FIND_PLAYER, [playerId]);
    return row ? toPlayer(row) : null;
}

export async function findInventoryByIds(
    playerId: string,
    ids: string[],
    tx: TxQuery = db,
): Promise<InventoryRow[]> {
    if (ids.length === 0) return [];
    return tx<InventoryRow>(FIND_INVENTORY_BY_IDS, [playerId, ids]);
}

export async function findEquipment(playerId: string, tx: TxQuery = db): Promise<EquipmentRow[]> {
    return tx<EquipmentRow>(FIND_EQUIPMENT, [playerId]);
}

export async function findTalismanBag(playerId: string, tx: TxQuery = db): Promise<TalismanBagRow[]> {
    return tx<TalismanBagRow>(FIND_TALISMAN_BAG, [playerId]);
}

/** How many bag pages the player has; `lock` holds the row until the transaction ends. */
export async function findTalismanBagPages(playerId: string, tx: TxQuery = db, lock = false): Promise<number> {
    const [row] = await tx<{ talisman_bag_pages: number }>(
        lock ? LOCK_TALISMAN_BAG_PAGES : FIND_TALISMAN_BAG_PAGES,
        [playerId],
    );
    return row?.talisman_bag_pages ?? 1;
}

export async function findHand(playerId: string, skill: string, tx: TxQuery = db): Promise<string[]> {
    const [row] = await tx<HandRow>(FIND_HAND, [playerId, skill]);
    return row?.inventory_ids ?? [];
}

export async function findInventory(playerId: string, tx: TxQuery = db): Promise<InventoryRow[]> {
    return tx<InventoryRow>(FIND_INVENTORY, [playerId]);
}

/** Everything `GET /geo/me` returns, in one round of reads. */
export async function findMe(playerId: string): Promise<GeoMeResponse | null> {
    const player = await findPlayer(playerId);
    if (!player) return null;

    const [inventory, equipment, talismanBag, bagPages, hands, xp, savedHands, lunchbox, bait, seedBag] = await Promise.all([
        findInventory(playerId),
        findEquipment(playerId),
        findTalismanBag(playerId),
        findTalismanBagPages(playerId),
        query<HandRow>(FIND_HANDS, [playerId]),
        query<SkillXpRow>(FIND_SKILL_XP, [playerId]),
        query<SavedHandRow>(FIND_SAVED_HANDS, [playerId]),
        findLunchbox(playerId),
        findBait(playerId),
        findSeedBag(playerId),
    ]);

    return {
        player,
        inventory: inventory.map(toInventoryEntry),
        equipment: Object.fromEntries(
            equipment.map((row) => [row.slot as GeoEquipmentSlot, row.inventory_id]),
        ),
        talismanBag: {
            pages: bagPages,
            inventoryIds: talismanBag.map((row) => row.inventory_id),
        },
        hands: Object.fromEntries(hands.map((row) => [row.skill, row.inventory_ids])),
        skillXp: Object.fromEntries(xp.map((row) => [row.skill, Number(row.xp)])),
        savedHands: savedHands.map(toSavedHand),
        lunchbox,
        bait,
        seedBag,
    };
}

/** How many slots the player has unlocked, and what's packed in them. */
export async function findLunchbox(playerId: string, tx: TxQuery = db): Promise<GeoLunchbox> {
    // One after another: `tx` may be a transaction's single connection.
    const [row] = await tx<{ lunchbox_slots: number }>(FIND_LUNCHBOX_SLOTS, [playerId]);
    const contents = await tx<LunchboxRow>(FIND_LUNCHBOX, [playerId]);
    return {
        slots: row?.lunchbox_slots ?? 1,
        contents: contents.map(
            (entry): GeoLunchboxSlot => ({ slot: entry.slot, itemId: entry.item_id, quantity: entry.quantity }),
        ),
    };
}

/** Puts a stack in a slot, replacing what was there. The caller moves the items. */
export async function setLunchboxSlot(tx: TxQuery, playerId: string, slot: number, itemId: string, quantity: number) {
    await tx(UPSERT_LUNCHBOX_SLOT, [playerId, slot, itemId, quantity]);
}

/**
 * Saves what's left in a slot after eating, from `from` down to `to`; an
 * emptied slot is cleared. Throws unless the slot still holds exactly `from`
 * of that food, so a fight can never eat food that's no longer there: the
 * whole turn, heal included, is undone instead.
 */
export async function eatFromLunchbox(
    tx: TxQuery,
    playerId: string,
    eaten: { slot: number; itemId: string; from: number; to: number },
) {
    const { slot, itemId, from, to } = eaten;
    if (!(to >= 0 && to < from)) throw new Error(`Bad lunchbox change ${from} → ${to}`);
    const [row] =
        to > 0
            ? await tx<{ slot: number }>(EAT_FROM_LUNCHBOX, [playerId, slot, itemId, from, to])
            : await tx<{ slot: number }>(EAT_LAST_FROM_LUNCHBOX, [playerId, slot, itemId, from]);
    if (!row) throw AppError.badRequest("That food is no longer in your lunchbox");
}

export async function clearLunchboxSlot(tx: TxQuery, playerId: string, slot: number) {
    await tx(DELETE_LUNCHBOX_SLOT, [playerId, slot]);
}

/** How many bait slots the player has unlocked, and what's packed in them. */
export async function findBait(playerId: string, tx: TxQuery = db): Promise<GeoBait> {
    // One after another: `tx` may be a transaction's single connection.
    const [row] = await tx<{ bait_slots: number }>(FIND_BAIT_SLOTS, [playerId]);
    const contents = await tx<BaitRow>(FIND_BAIT, [playerId]);
    return {
        slots: row?.bait_slots ?? 1,
        contents: contents.map(
            (entry): GeoBaitSlot => ({ slot: entry.slot, itemId: entry.item_id, quantity: entry.quantity }),
        ),
    };
}

/** Puts a stack in a bait slot, replacing what was there. The caller moves the items. */
export async function setBaitSlot(tx: TxQuery, playerId: string, slot: number, itemId: string, quantity: number) {
    await tx(UPSERT_BAIT_SLOT, [playerId, slot, itemId, quantity]);
}

/**
 * Puts one bait from a slot on the hook; the emptied slot is cleared. Throws
 * unless the slot still holds exactly `from` of that bait, so a cast never
 * uses bait that's no longer there.
 */
export async function useBait(tx: TxQuery, playerId: string, used: { slot: number; itemId: string; from: number }) {
    const { slot, itemId, from } = used;
    const [row] =
        from > 1
            ? await tx<{ slot: number }>(USE_BAIT, [playerId, slot, itemId, from])
            : await tx<{ slot: number }>(USE_LAST_BAIT, [playerId, slot, itemId, from]);
    if (!row) throw AppError.badRequest("That bait is no longer packed");
}

export async function clearBaitSlot(tx: TxQuery, playerId: string, slot: number) {
    await tx(DELETE_BAIT_SLOT, [playerId, slot]);
}

/** How many Seed Bag slots the player has unlocked, and what's packed in them. */
export async function findSeedBag(playerId: string, tx: TxQuery = db): Promise<GeoSeedBag> {
    // One after another: `tx` may be a transaction's single connection.
    const [row] = await tx<{ seed_bag_slots: number }>(FIND_SEED_BAG_SLOTS, [playerId]);
    const contents = await tx<BaitRow>(FIND_SEED_BAG, [playerId]);
    return {
        slots: row?.seed_bag_slots ?? 1,
        contents: contents.map((entry) => ({ slot: entry.slot, itemId: entry.item_id, quantity: entry.quantity })),
    };
}

export async function setSeedBagSlots(tx: TxQuery, playerId: string, slots: number) {
    await tx(SET_SEED_BAG_SLOTS, [playerId, slots]);
}

/** Puts a stack in a Seed Bag slot, replacing what was there. The caller moves the items. */
export async function setSeedBagSlot(tx: TxQuery, playerId: string, slot: number, itemId: string, quantity: number) {
    await tx(UPSERT_SEED_BAG_SLOT, [playerId, slot, itemId, quantity]);
}

/** Takes one seed from a slot to plant; throws unless it still holds exactly `from`, like useBait. */
export async function useSeed(tx: TxQuery, playerId: string, used: { slot: number; itemId: string; from: number }) {
    const { slot, itemId, from } = used;
    const [row] =
        from > 1
            ? await tx<{ slot: number }>(USE_SEED, [playerId, slot, itemId, from])
            : await tx<{ slot: number }>(USE_LAST_SEED, [playerId, slot, itemId, from]);
    if (!row) throw AppError.badRequest("Those seeds are no longer packed");
}

export async function clearSeedBagSlot(tx: TxQuery, playerId: string, slot: number) {
    await tx(DELETE_SEED_BAG_SLOT, [playerId, slot]);
}

function toSavedHand(row: SavedHandRow): GeoSavedHand {
    return {
        id: row.id,
        skill: row.skill,
        name: row.name,
        inventoryIds: row.inventory_ids,
        createdAt: row.created_at.toISOString(),
    };
}

export async function findSavedHand(
    tx: TxQuery,
    playerId: string,
    savedHandId: string,
): Promise<GeoSavedHand | null> {
    const [row] = await tx<SavedHandRow>(FIND_SAVED_HAND, [playerId, savedHandId]);
    return row ? toSavedHand(row) : null;
}

export async function insertSavedHand(
    tx: TxQuery,
    playerId: string,
    skill: string,
    name: string,
    inventoryIds: string[],
) {
    await tx(INSERT_SAVED_HAND, [playerId, skill, name, inventoryIds]);
}

export async function deleteSavedHand(tx: TxQuery, playerId: string, savedHandId: string) {
    await tx(DELETE_SAVED_HAND, [playerId, savedHandId]);
}

/**
 * Adds items to a player's inventory. Stackable kinds (materials,
 * consumables, misc) join an existing stack; cards arrive with full charges
 * unless `chargesLeft` says otherwise, one row per copy; gear and talismans
 * one row each. Returns the new or updated row ids. Unknown item ids throw, so
 * a content typo can't silently drop loot.
 */
export async function grantItems(
    tx: TxQuery,
    playerId: string,
    grants: { itemId: string; quantity: number; chargesLeft?: number }[],
): Promise<string[]> {
    const ids: string[] = [];
    for (const { itemId, quantity, chargesLeft } of grants) {
        const item = CONTENT.items[itemId];
        if (!item) throw new Error(`Unknown item "${itemId}"`);

        if (isStackable(item)) {
            const [stacked] = await tx<{ id: string }>(ADD_TO_STACK, [playerId, itemId, quantity]);
            if (stacked) {
                ids.push(stacked.id);
                continue;
            }
            const [row] = await tx<InventoryRow>(INSERT_INVENTORY, [playerId, itemId, quantity, null]);
            if (row) ids.push(row.id);
            continue;
        }

        const charges = item.kind === "card" ? (chargesLeft ?? item.maxCharges) : null;
        for (let i = 0; i < quantity; i++) {
            const [row] = await tx<InventoryRow>(INSERT_INVENTORY, [playerId, itemId, 1, charges]);
            if (row) ids.push(row.id);
        }
    }
    return ids;
}

/** Why coins moved, as the ledger records it. */
export type CoinReason =
    | "run-loot"
    | "chest-open"
    | "run-defeat"
    | GeoDeathCause
    | "vendor-buy"
    | "farm-tile"
    | "research-lab"
    | "farm-order"
    | "farm-contest"
    | "vendor-sell"
    | "market-fee"
    | "market-bid-hold"
    | "market-bid-return"
    | "market-buy"
    | "market-collect"
    | "admin-grant";

/** Adds coins (or takes them, with a negative amount) and records why. */
export async function addCoins(tx: TxQuery, playerId: string, amount: number, reason: CoinReason, reference: string) {
    if (amount === 0) return;
    await tx(ADD_COINS, [playerId, amount]);
    await tx(INSERT_COIN_LEDGER, [playerId, amount, reason, reference]);
}

/** Takes every coin the player has and records it. Returns how many. */
export async function loseAllCoins(tx: TxQuery, playerId: string, reason: CoinReason, reference: string): Promise<number> {
    const [row] = await tx<{ lost: string }>(EMPTY_COINS, [playerId]);
    const lost = Number(row?.lost ?? 0);
    if (lost > 0) await tx(INSERT_COIN_LEDGER, [playerId, -lost, reason, reference]);
    return lost;
}

/**
 * Saves a card's charges. Throws if the card has left the player's inventory
 * (sold, listed, crafted away), so a fight can never keep using a card that's
 * gone: the whole turn is undone instead.
 */
export async function setCharges(tx: TxQuery, playerId: string, inventoryId: string, charges: number) {
    const [row] = await tx<{ id: string }>(SET_CHARGES, [playerId, inventoryId, charges]);
    if (!row) throw AppError.badRequest("That card is no longer in your inventory");
}

/** Locks the player row until the transaction ends (see LOCK_PLAYER). */
export async function lockPlayer(tx: TxQuery, playerId: string) {
    await tx(LOCK_PLAYER, [playerId]);
}

export async function equip(tx: TxQuery, playerId: string, slot: string, inventoryId: string) {
    await tx(UNEQUIP_INVENTORY, [playerId, inventoryId]);
    await tx(UPSERT_EQUIPMENT, [playerId, slot, inventoryId]);
}

export async function clearSlot(tx: TxQuery, playerId: string, slot: string) {
    await tx(CLEAR_SLOT, [playerId, slot]);
}

export async function addToTalismanBag(tx: TxQuery, playerId: string, itemId: string, inventoryId: string) {
    await tx(INSERT_TALISMAN_BAG, [playerId, itemId, inventoryId]);
}

export async function removeFromTalismanBag(tx: TxQuery, playerId: string, inventoryId: string) {
    await tx(DELETE_TALISMAN_BAG, [playerId, inventoryId]);
}

export async function setHand(tx: TxQuery, playerId: string, skill: string, inventoryIds: string[]) {
    await tx(UPSERT_HAND, [playerId, skill, inventoryIds]);
}

/** The player's level in every skill they have XP in; others are level 1. */
export async function findSkillLevels(tx: TxQuery, playerId: string): Promise<Record<string, number>> {
    const rows = await tx<SkillXpRow>(FIND_SKILL_XP, [playerId]);
    return Object.fromEntries(rows.map((row) => [row.skill, geoSkillLevel(Number(row.xp))]));
}

export async function addSkillXp(tx: TxQuery, playerId: string, skill: string, amount: number) {
    if (amount > 0) await tx(ADD_SKILL_XP, [playerId, skill, amount]);
}

/**
 * Takes `amount` coins, or refuses with "Not enough coins" and takes none.
 * Every purchase goes through here before anything is handed over.
 */
export async function spendCoins(tx: TxQuery, playerId: string, amount: number, reason: CoinReason, reference: string) {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`Bad coin amount ${amount}`);
    if (amount === 0) return;
    const [row] = await tx<{ coins: string }>(SPEND_COINS, [playerId, amount]);
    if (!row) throw AppError.badRequest("Not enough coins");
    await tx(INSERT_COIN_LEDGER, [playerId, -amount, reason, reference]);
}

/**
 * Refuses if the row is worn, in the Talisman Bag or in a hand: selling or
 * listing it would pull it out of the player's build without them noticing.
 */
export async function assertNotInUse(tx: TxQuery, playerId: string, inventoryId: string, name: string) {
    const [uses] = await tx<{ equipped: boolean; bagged: boolean; in_hand: boolean }>(FIND_USES, [playerId, inventoryId]);
    if (uses?.equipped) throw AppError.badRequest(`Unequip ${name} first`);
    if (uses?.bagged) throw AppError.badRequest(`Take ${name} out of the Talisman Bag first`);
    if (uses?.in_hand) throw AppError.badRequest(`Take ${name} out of your hand first`);
}

/**
 * Takes `quantity` of an item from wherever the player has it free, oldest
 * rows first, e.g. a recipe's inputs. Rows worn, bagged or in a hand are
 * never touched, and a card counts only at full charge. Refuses, taking
 * nothing, when there isn't enough.
 */
export async function takeItems(tx: TxQuery, playerId: string, itemId: string, quantity: number) {
    const item = CONTENT.items[itemId];
    if (!item) throw new Error(`Unknown item "${itemId}"`);
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error(`Bad quantity ${quantity}`);
    const rows = (await tx<InventoryRow>(LOCK_FREE_ROWS_OF_ITEM, [playerId, itemId])).filter(
        (row) => item.kind !== "card" || row.charges_left === item.maxCharges,
    );
    const have = rows.reduce((sum, row) => sum + row.quantity, 0);
    if (have < quantity) throw AppError.badRequest(`You need ${quantity} ${item.name} and have ${have} free`);

    let left = quantity;
    for (const row of rows) {
        if (left === 0) break;
        const taken = Math.min(left, row.quantity);
        if (taken === row.quantity) await tx(DELETE_INVENTORY_ROW, [playerId, row.id]);
        else await tx(TAKE_FROM_STACK, [playerId, row.id, taken]);
        left -= taken;
    }
}

/**
 * Takes `quantity` of an owned row out of the inventory, locked so nothing
 * else can take it at the same time: the whole row when that's all of it,
 * else just that many from the stack. Returns the row as it was, so the copy
 * can be restored or handed on. Refuses an item in use.
 */
export async function takeFromInventory(
    tx: TxQuery,
    playerId: string,
    inventoryId: string,
    quantity: number,
): Promise<InventoryRow> {
    const [row] = await tx<InventoryRow>(LOCK_INVENTORY_ROW, [playerId, inventoryId]);
    if (!row) throw AppError.notFound("You don't own that item");
    const name = CONTENT.items[row.item_id]?.name ?? "that item";
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw AppError.badRequest("Choose at least 1");
    if (quantity > row.quantity) throw AppError.badRequest(`You only have ${row.quantity} ${name}`);
    await assertNotInUse(tx, playerId, inventoryId, name);

    if (quantity === row.quantity) await tx(DELETE_INVENTORY_ROW, [playerId, inventoryId]);
    else await tx(TAKE_FROM_STACK, [playerId, inventoryId, quantity]);
    return row;
}

/**
 * Hands a single copy back as it was (same id and obtained date), e.g. a
 * cancelled listing. A stackable joins the player's stack instead.
 */
export async function restoreItem(
    tx: TxQuery,
    playerId: string,
    copy: { inventoryId: string | null; itemId: string; quantity: number; chargesLeft: number | null; obtainedAt: Date },
) {
    const item = CONTENT.items[copy.itemId];
    if (!item) throw new Error(`Unknown item "${copy.itemId}"`);
    if (isStackable(item) || !copy.inventoryId) {
        await grantItems(tx, playerId, [{ itemId: copy.itemId, quantity: copy.quantity, chargesLeft: copy.chargesLeft ?? undefined }]);
        return;
    }
    const [restored] = await tx<{ id: string }>(RESTORE_INVENTORY_ROW, [
        copy.inventoryId,
        playerId,
        copy.itemId,
        1,
        copy.chargesLeft,
        copy.obtainedAt,
    ]);
    // The id was somehow taken: hand it back as a new copy rather than lose it.
    if (!restored) {
        await grantItems(tx, playerId, [{ itemId: copy.itemId, quantity: 1, chargesLeft: copy.chargesLeft ?? undefined }]);
    }
}
