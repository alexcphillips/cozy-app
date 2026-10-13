import type { Request, Response } from "express";
import {
    GEO_BAIT_MAX_SLOTS,
    GEO_BAIT_STACK_SIZE,
    GEO_SEED_BAG_MAX_SLOTS,
    GEO_SEED_BAG_STACK_SIZE,
    GEO_EQUIPMENT_SLOTS,
    GEO_HAND_SIZE,
    GEO_LUNCHBOX_MAX_SLOTS,
    GEO_LUNCHBOX_STACK_SIZE,
    GEO_TALISMAN_BAG_FULL,
    GEO_TALISMAN_BAG_PAGE_SIZE,
    geoSlotKind,
    type GeoEquipmentSlot,
    type GeoPackBaitRequest,
    type GeoPackSeedsRequest,
    type GeoEquipRequest,
    type GeoPackLunchboxRequest,
    type GeoSaveHandRequest,
    type GeoSetHandRequest,
} from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { CONTENT } from "../../content";
import { withTransaction, type TxQuery } from "../../db/transaction";
import { requirePlayerId } from "../../middleware/geo-auth";
import * as runsRepository from "../runs/geo-runs.repository";
import * as playerRepository from "./geo-player.repository";

export async function getMe(req: Request, res: Response) {
    const me = await playerRepository.findMe(requirePlayerId(req));
    if (!me) throw AppError.notFound("Player not found");
    res.status(200).json(me);
}

/** Puts an owned piece of equipment in a slot, or empties the slot. */
export async function setEquipment(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const slot = req.params.slot as GeoEquipmentSlot;
    if (!GEO_EQUIPMENT_SLOTS.includes(slot)) throw AppError.badRequest("Unknown slot");

    const { inventoryId } = (req.body ?? {}) as Partial<GeoEquipRequest>;

    await withTransaction(async (tx) => {
        if (inventoryId === null || inventoryId === undefined) {
            await playerRepository.clearSlot(tx, playerId, slot);
            return;
        }
        if (typeof inventoryId !== "string") throw AppError.badRequest("inventoryId must be a string or null");

        const [row] = await playerRepository.findInventoryByIds(playerId, [inventoryId], tx);
        if (!row) throw AppError.notFound("You don't own that item");

        const item = CONTENT.items[row.item_id];
        if (item?.kind !== "equipment") throw AppError.badRequest("That item can't be equipped");
        if (item.slot !== geoSlotKind(slot)) throw AppError.badRequest(`That goes in a ${item.slot} slot`);

        await playerRepository.equip(tx, playerId, slot, inventoryId);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/**
 * Puts an owned talisman in the bag, unless a copy of it is already there or
 * every page is full. Taking one out leaves it in the inventory.
 */
export async function addToTalismanBag(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const inventoryId = String(req.params.inventoryId);

    await withTransaction(async (tx) => {
        const [row] = await playerRepository.findInventoryByIds(playerId, [inventoryId], tx);
        if (!row) throw AppError.notFound("You don't own that item");

        const item = CONTENT.items[row.item_id];
        if (item?.kind !== "talisman") throw AppError.badRequest("Only talismans go in the Talisman Bag");

        const pages = await playerRepository.findTalismanBagPages(playerId, tx, true);
        const bag = await playerRepository.findTalismanBag(playerId, tx);
        if (bag.some((entry) => entry.inventory_id === inventoryId)) return;
        if (bag.some((entry) => entry.item_id === row.item_id)) {
            throw AppError.badRequest(`Your bag already has a ${item.name}`);
        }
        if (bag.length >= pages * GEO_TALISMAN_BAG_PAGE_SIZE) throw AppError.badRequest(GEO_TALISMAN_BAG_FULL);
        await playerRepository.addToTalismanBag(tx, playerId, row.item_id, inventoryId);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

export async function removeFromTalismanBag(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    await withTransaction((tx) =>
        playerRepository.removeFromTalismanBag(tx, playerId, String(req.params.inventoryId)),
    );
    res.status(200).json(await playerRepository.findMe(playerId));
}

/** Most saved hands a player keeps per skill. PLACEHOLDER. */
const MAX_SAVED_HANDS_PER_SKILL = 10;

/**
 * The deck rules, checked here so the app can't be talked past them: only
 * that skill's cards, none faded, no two copies of the same card, at most
 * GEO_HAND_SIZE. Throws the first rule broken.
 */
async function assertValidHand(tx: TxQuery, playerId: string, skill: string, inventoryIds: string[]) {
    if (inventoryIds.length > GEO_HAND_SIZE) throw AppError.badRequest(`A hand holds ${GEO_HAND_SIZE} cards`);
    if (new Set(inventoryIds).size !== inventoryIds.length) throw AppError.badRequest("A card is listed twice");

    const rows = await playerRepository.findInventoryByIds(playerId, inventoryIds, tx);
    if (rows.length !== inventoryIds.length) throw AppError.notFound("You don't own one of those cards");

    const cardIds = new Set<string>();
    for (const row of rows) {
        const item = CONTENT.items[row.item_id];
        if (item?.kind !== "card") throw AppError.badRequest("Only cards go in a hand");
        const card = CONTENT.cards[item.cardId];
        if (card?.skill !== skill) throw AppError.badRequest(`${item.name} isn't a ${skill} card`);
        if ((row.charges_left ?? 0) <= 0) throw AppError.badRequest(`${item.name} has faded`);
        if (cardIds.has(item.cardId)) throw AppError.badRequest(`Only one ${item.name} per hand`);
        cardIds.add(item.cardId);
    }
}

function parseIds(value: unknown): string[] {
    if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
        throw AppError.badRequest("inventoryIds must be a list of ids");
    }
    return value;
}

export async function setHand(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const skill = String(req.params.skill);
    const inventoryIds = parseIds(((req.body ?? {}) as Partial<GeoSetHandRequest>).inventoryIds);

    await withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await runsRepository.assertHandNotInRun(tx, playerId, skill);
        await assertValidHand(tx, playerId, skill, inventoryIds);
        await playerRepository.setHand(tx, playerId, skill, inventoryIds);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/** Saves a skill's current hand under a name. */
export async function saveHand(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const { skill, name } = (req.body ?? {}) as Partial<GeoSaveHandRequest>;
    if (typeof skill !== "string" || !skill) throw AppError.badRequest("Missing skill");
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed || trimmed.length > 40) throw AppError.badRequest("A name of 1–40 characters");

    await withTransaction(async (tx) => {
        const me = await playerRepository.findMe(playerId);
        if ((me?.savedHands.filter((hand) => hand.skill === skill).length ?? 0) >= MAX_SAVED_HANDS_PER_SKILL) {
            throw AppError.badRequest(`At most ${MAX_SAVED_HANDS_PER_SKILL} saved hands per skill`);
        }
        const current = await playerRepository.findHand(playerId, skill, tx);
        if (current.length === 0) throw AppError.badRequest("That hand is empty");
        await playerRepository.insertSavedHand(tx, playerId, skill, trimmed, current);
    });

    res.status(201).json(await playerRepository.findMe(playerId));
}

/**
 * Makes a saved hand the current one. Cards that have since faded or left the
 * inventory are dropped rather than refusing the whole hand.
 */
export async function loadSavedHand(req: Request, res: Response) {
    const playerId = requirePlayerId(req);

    await withTransaction(async (tx) => {
        const saved = await playerRepository.findSavedHand(tx, playerId, String(req.params.savedHandId));
        if (!saved) throw AppError.notFound("Saved hand not found");
        await playerRepository.lockPlayer(tx, playerId);
        await runsRepository.assertHandNotInRun(tx, playerId, saved.skill);

        const rows = await playerRepository.findInventoryByIds(playerId, saved.inventoryIds, tx);
        const usable = saved.inventoryIds.filter((id) => {
            const row = rows.find((r) => r.id === id);
            return row !== undefined && (row.charges_left ?? 0) > 0;
        });
        await assertValidHand(tx, playerId, saved.skill, usable);
        await playerRepository.setHand(tx, playerId, saved.skill, usable);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

export async function deleteSavedHand(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    await withTransaction((tx) =>
        playerRepository.deleteSavedHand(tx, playerId, String(req.params.savedHandId)),
    );
    res.status(200).json(await playerRepository.findMe(playerId));
}

/** The `:slot` param as a lunchbox slot index, or a 400. */
function parseLunchboxSlot(value: unknown): number {
    const slot = Number(value);
    if (!Number.isInteger(slot) || slot < 0 || slot >= GEO_LUNCHBOX_MAX_SLOTS) {
        throw AppError.badRequest("Unknown lunchbox slot");
    }
    return slot;
}

/** Puts back whatever is packed in `slot`, so it can be refilled or left empty. */
async function unpackSlot(tx: TxQuery, playerId: string, slot: number) {
    const lunchbox = await playerRepository.findLunchbox(playerId, tx);
    const packed = lunchbox.contents.find((entry) => entry.slot === slot);
    if (!packed) return;
    await playerRepository.grantItems(tx, playerId, [{ itemId: packed.itemId, quantity: packed.quantity }]);
    await playerRepository.clearLunchboxSlot(tx, playerId, slot);
}

/**
 * Packs food into a lunchbox slot: whatever the slot held goes back to the
 * inventory, then `quantity` of the food leaves it. One food per slot, and
 * no food in two slots. Not mid-Run: the fight eats from its own copy.
 */
export async function packLunchbox(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const slot = parseLunchboxSlot(req.params.slot);
    const { itemId, quantity } = (req.body ?? {}) as Partial<GeoPackLunchboxRequest>;
    if (typeof itemId !== "string") throw AppError.badRequest("Missing itemId");
    if (!Number.isInteger(quantity) || quantity! < 1 || quantity! > GEO_LUNCHBOX_STACK_SIZE) {
        throw AppError.badRequest(`A lunchbox slot holds 1–${GEO_LUNCHBOX_STACK_SIZE}`);
    }
    const item = CONTENT.items[itemId];
    if (item?.kind !== "consumable" || !item.food) throw AppError.badRequest("Only food goes in the lunchbox");

    await withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await runsRepository.assertNotInRun(tx, playerId, "You can't repack your lunchbox mid-Run");

        const lunchbox = await playerRepository.findLunchbox(playerId, tx);
        if (slot >= lunchbox.slots) throw AppError.badRequest("That lunchbox slot is still locked");
        const elsewhere = lunchbox.contents.find((entry) => entry.itemId === itemId && entry.slot !== slot);
        if (elsewhere) throw AppError.badRequest(`${item.name} is already in another slot`);

        await unpackSlot(tx, playerId, slot);
        await playerRepository.takeItems(tx, playerId, itemId, quantity!);
        await playerRepository.setLunchboxSlot(tx, playerId, slot, itemId, quantity!);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/** Empties a lunchbox slot back into the inventory. */
export async function unpackLunchbox(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const slot = parseLunchboxSlot(req.params.slot);

    await withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await runsRepository.assertNotInRun(tx, playerId, "You can't repack your lunchbox mid-Run");
        await unpackSlot(tx, playerId, slot);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/** The `:slot` param as a bait slot index, or a 400. */
function parseBaitSlot(value: unknown): number {
    const slot = Number(value);
    if (!Number.isInteger(slot) || slot < 0 || slot >= GEO_BAIT_MAX_SLOTS) {
        throw AppError.badRequest("Unknown bait slot");
    }
    return slot;
}

/** Puts back whatever bait is packed in `slot`, so it can be refilled or left empty. */
async function unpackBaitSlot(tx: TxQuery, playerId: string, slot: number) {
    const bait = await playerRepository.findBait(playerId, tx);
    const packed = bait.contents.find((entry) => entry.slot === slot);
    if (!packed) return;
    await playerRepository.grantItems(tx, playerId, [{ itemId: packed.itemId, quantity: packed.quantity }]);
    await playerRepository.clearBaitSlot(tx, playerId, slot);
}

/**
 * Packs bait into a bait slot, the same way as the lunchbox: whatever the
 * slot held goes back to the inventory, then `quantity` of the bait leaves
 * it. One bait per slot, and no bait in two slots. No combat Run uses bait,
 * so there's no mid-Run lock until fishing Runs exist.
 */
export async function packBait(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const slot = parseBaitSlot(req.params.slot);
    const { itemId, quantity } = (req.body ?? {}) as Partial<GeoPackBaitRequest>;
    if (typeof itemId !== "string") throw AppError.badRequest("Missing itemId");
    if (!Number.isInteger(quantity) || quantity! < 1 || quantity! > GEO_BAIT_STACK_SIZE) {
        throw AppError.badRequest(`A bait slot holds 1–${GEO_BAIT_STACK_SIZE}`);
    }
    const item = CONTENT.items[itemId];
    if (item?.kind !== "consumable" || !item.bait) throw AppError.badRequest("Only bait goes in the bait slots");

    await withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);

        const bait = await playerRepository.findBait(playerId, tx);
        if (slot >= bait.slots) throw AppError.badRequest("That bait slot is still locked");
        const elsewhere = bait.contents.find((entry) => entry.itemId === itemId && entry.slot !== slot);
        if (elsewhere) throw AppError.badRequest(`${item.name} is already in another slot`);

        await unpackBaitSlot(tx, playerId, slot);
        await playerRepository.takeItems(tx, playerId, itemId, quantity!);
        await playerRepository.setBaitSlot(tx, playerId, slot, itemId, quantity!);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/** Empties a bait slot back into the inventory. */
export async function unpackBait(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const slot = parseBaitSlot(req.params.slot);

    await withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await unpackBaitSlot(tx, playerId, slot);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/** The `:slot` param as a Seed Bag slot index, or a 400. */
function parseSeedBagSlot(value: unknown): number {
    const slot = Number(value);
    if (!Number.isInteger(slot) || slot < 0 || slot >= GEO_SEED_BAG_MAX_SLOTS) {
        throw AppError.badRequest("Unknown Seed Bag slot");
    }
    return slot;
}

/** Puts back whatever seeds are packed in `slot`. */
async function unpackSeedBagSlot(tx: TxQuery, playerId: string, slot: number) {
    const bag = await playerRepository.findSeedBag(playerId, tx);
    const packed = bag.contents.find((entry) => entry.slot === slot);
    if (!packed) return;
    await playerRepository.grantItems(tx, playerId, [{ itemId: packed.itemId, quantity: packed.quantity }]);
    await playerRepository.clearSeedBagSlot(tx, playerId, slot);
}

/**
 * Packs seeds into a Seed Bag slot, the same way as bait: whatever the slot
 * held goes back to the inventory, then `quantity` of the seed leaves it.
 * Only seeds a crop grows from go in.
 */
export async function packSeeds(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const slot = parseSeedBagSlot(req.params.slot);
    const { itemId, quantity } = (req.body ?? {}) as Partial<GeoPackSeedsRequest>;
    if (typeof itemId !== "string") throw AppError.badRequest("Missing itemId");
    if (!Number.isInteger(quantity) || quantity! < 1 || quantity! > GEO_SEED_BAG_STACK_SIZE) {
        throw AppError.badRequest(`A Seed Bag slot holds 1–${GEO_SEED_BAG_STACK_SIZE}`);
    }
    const item = CONTENT.items[itemId];
    if (!item || !Object.values(CONTENT.crops).some((crop) => crop.seed === itemId)) {
        throw AppError.badRequest("Only seeds go in the Seed Bag");
    }

    await withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);

        const bag = await playerRepository.findSeedBag(playerId, tx);
        if (slot >= bag.slots) throw AppError.badRequest("That Seed Bag slot is still locked");
        const elsewhere = bag.contents.find((entry) => entry.itemId === itemId && entry.slot !== slot);
        if (elsewhere) throw AppError.badRequest(`${item.name} are already in another slot`);

        await unpackSeedBagSlot(tx, playerId, slot);
        await playerRepository.takeItems(tx, playerId, itemId, quantity!);
        await playerRepository.setSeedBagSlot(tx, playerId, slot, itemId, quantity!);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/** Empties a Seed Bag slot back into the inventory. */
export async function unpackSeeds(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const slot = parseSeedBagSlot(req.params.slot);

    await withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await unpackSeedBagSlot(tx, playerId, slot);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}
