import { randomInt } from "node:crypto";
import type { Request, Response } from "express";
import {
    GEO_VENDOR_MAX_QUANTITY,
    type GeoRarity,
    type GeoVendor,
    type GeoVendorBuyRequest,
    type GeoVendorReforgeRequest,
    type GeoVendorSellRequest,
    type GeoVendorsResponse,
} from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { CONTENT, reforgesFor, sellValueOf, vendorBuys, type VendorDef } from "../../content";
import { withTransaction } from "../../db/transaction";
import { requirePlayerId } from "../../middleware/geo-auth";
import * as playerRepository from "../player/geo-player.repository";
import { applyModifiers, globalModifiers } from "../../world/global-effects";
import type { StatModifier } from "../../engine/engine.types";

/**
 * What a vendor charges now: its list price, scaled by global effects (e.g.
 * Malphas's Dark Bargain), rounded up, and never under what vendors pay back
 * for it — so no perk can make buy-and-resell print coins.
 */
function priceNow(itemId: string, listPrice: number, modifiers: StatModifier[]): number {
    const item = CONTENT.items[itemId];
    const floor = item && Object.values(CONTENT.vendors).some((v) => vendorBuys(v.buys, item)) ? sellValueOf(item) : 1;
    return Math.max(floor, Math.ceil(applyModifiers(listPrice, modifiers, "vendorPrices")));
}

/** What a reroll costs now: the vendor's price for the rarity, scaled by global effects like any vendor price. */
function reforgeCostNow(cost: Record<GeoRarity, number>, rarity: GeoRarity, modifiers: StatModifier[]): number {
    return Math.max(1, Math.ceil(applyModifiers(cost[rarity], modifiers, "vendorPrices")));
}

function toVendorView(vendor: VendorDef, modifiers: StatModifier[]): GeoVendor {
    return {
        id: vendor.id,
        name: vendor.name,
        icon: vendor.icon,
        description: vendor.description,
        sells: vendor.sells.map((offer) => ({
            itemId: offer.itemId,
            price: priceNow(offer.itemId, offer.price, modifiers),
            stock: offer.stock,
            ...(offer.tab && { tab: offer.tab }),
        })),
        buys: Object.values(CONTENT.items)
            .filter((item) => vendorBuys(vendor.buys, item))
            .map((item) => ({ itemId: item.id, price: sellValueOf(item) })),
        ...(vendor.reforge && {
            reforgeCost: Object.fromEntries(
                Object.keys(vendor.reforge.cost).map((rarity) => [
                    rarity,
                    reforgeCostNow(vendor.reforge!.cost, rarity as GeoRarity, modifiers),
                ]),
            ) as Record<GeoRarity, number>,
        }),
    };
}

function findVendor(req: Request): VendorDef {
    const vendor = CONTENT.vendors[String(req.params.vendorId)];
    if (!vendor) throw AppError.notFound("No such vendor");
    return vendor;
}

function readQuantity(value: unknown): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > GEO_VENDOR_MAX_QUANTITY) {
        throw AppError.badRequest(`Choose between 1 and ${GEO_VENDOR_MAX_QUANTITY}`);
    }
    return value;
}

export async function listVendors(_req: Request, res: Response) {
    const modifiers = await globalModifiers();
    const body: GeoVendorsResponse = {
        vendors: Object.values(CONTENT.vendors).map((vendor) => toVendorView(vendor, modifiers)),
    };
    res.status(200).json(body);
}

/**
 * The player buys from a vendor: the coins are taken first, and only then is
 * the item handed over, in one transaction — so either both happen or neither.
 */
export async function buy(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const vendor = findVendor(req);
    const { itemId, quantity } = (req.body ?? {}) as Partial<GeoVendorBuyRequest>;
    const offer = vendor.sells.find((entry) => entry.itemId === itemId);
    if (!offer) throw AppError.badRequest(`The ${vendor.name} doesn't sell that`);
    const units = readQuantity(quantity);

    await withTransaction(async (tx) => {
        const reference = `vendor:${vendor.id}:${offer.itemId}x${units}`;
        const price = priceNow(offer.itemId, offer.price, await globalModifiers(tx));
        await playerRepository.spendCoins(tx, playerId, price * units, "vendor-buy", reference);
        await playerRepository.grantItems(tx, playerId, [{ itemId: offer.itemId, quantity: units }]);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/**
 * The player sells to a vendor: the item leaves the inventory first (locked,
 * so it can't also be listed or sold twice), then the coins are paid.
 */
export async function sell(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const vendor = findVendor(req);
    const { inventoryId, quantity } = (req.body ?? {}) as Partial<GeoVendorSellRequest>;
    if (typeof inventoryId !== "string" || !inventoryId) throw AppError.badRequest("Missing inventoryId");
    const units = readQuantity(quantity);

    await withTransaction(async (tx) => {
        const [owned] = await playerRepository.findInventoryByIds(playerId, [inventoryId], tx);
        if (!owned) throw AppError.notFound("You don't own that item");
        const item = CONTENT.items[owned.item_id];
        if (!item || !vendorBuys(vendor.buys, item)) throw AppError.badRequest(`The ${vendor.name} doesn't buy that`);
        if (item.kind === "card" && owned.charges_left !== item.maxCharges) {
            throw AppError.badRequest("Only cards at full charge can be sold");
        }

        const taken = await playerRepository.takeFromInventory(tx, playerId, inventoryId, units);
        // Again on the locked row: a turn could have spent a charge since the read above.
        if (item.kind === "card" && taken.charges_left !== item.maxCharges) {
            throw AppError.badRequest("Only cards at full charge can be sold");
        }
        const reference = `vendor:${vendor.id}:${taken.item_id}x${units}`;
        await playerRepository.addCoins(tx, playerId, sellValueOf(item) * units, "vendor-sell", reference);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}

/**
 * The player pays a vendor to reroll one weapon or armour copy's reforge: a
 * random one that fits the item, never the one it has. Worn gear can be
 * reforged in place. The copy is locked, so two rerolls can't cross.
 */
export async function reforge(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const vendor = findVendor(req);
    const { inventoryId } = (req.body ?? {}) as Partial<GeoVendorReforgeRequest>;
    if (!vendor.reforge) throw AppError.badRequest(`The ${vendor.name} doesn't reforge`);
    if (typeof inventoryId !== "string" || !inventoryId) throw AppError.badRequest("Missing inventoryId");
    const costs = vendor.reforge.cost;

    await withTransaction(async (tx) => {
        const owned = await playerRepository.lockInventoryRow(tx, playerId, inventoryId);
        if (!owned) throw AppError.notFound("You don't own that item");
        const item = CONTENT.items[owned.item_id];
        const choices = reforgesFor(CONTENT, item).filter((candidate) => candidate.id !== owned.reforge);
        if (!item || choices.length === 0) throw AppError.badRequest("Only weapons and armour can be reforged");

        const picked = choices[randomInt(choices.length)]!;
        const cost = reforgeCostNow(costs, item.rarity, await globalModifiers(tx));
        await playerRepository.spendCoins(tx, playerId, cost, "vendor-reforge", `vendor:${vendor.id}:reforge:${owned.id}`);
        await playerRepository.setReforge(tx, playerId, owned.id, picked.id);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}
