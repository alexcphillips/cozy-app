import type { Request, Response } from "express";
import { GEO_FARM_ACTION_TYPES, type GeoFarmAction } from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { requirePlayerId } from "../../middleware/geo-auth";
import * as farmingRepository from "./geo-farming.repository";

export async function getFarm(req: Request, res: Response) {
    res.status(200).json(await farmingRepository.findFarm(requirePlayerId(req)));
}

const isInt = (value: unknown): value is number => Number.isInteger(value);

/**
 * One farm action. PLACEHOLDER: the server can't yet tell the player is at
 * a farming place (same as fishing's water tier, see the backend TODO on
 * location spoofing), so the app only offers work at one.
 */
export async function act(req: Request, res: Response) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const type = body.type;
    if (!(GEO_FARM_ACTION_TYPES as readonly unknown[]).includes(type)) throw AppError.badRequest("type must be a farm action");

    let action: GeoFarmAction;
    if (type === "advance") {
        action = { type };
    } else {
        if (!isInt(body.tile)) throw AppError.badRequest("Missing tile");
        const tile = body.tile;
        if (type === "plant") {
            if (!isInt(body.slot)) throw AppError.badRequest("Missing slot");
            action = { type, tile, slot: body.slot };
        } else if (type === "play") {
            if (typeof body.inventoryId !== "string") throw AppError.badRequest("Missing inventoryId");
            action = { type, tile, inventoryId: body.inventoryId };
        } else if (type === "blueprint") {
            if (body.cropId !== null && typeof body.cropId !== "string") throw AppError.badRequest("cropId must be a crop or null");
            action = { type, tile, cropId: body.cropId };
        } else {
            action = { type: type as "water" | "harvest" | "clear" | "unlock", tile };
        }
    }
    res.status(200).json(await farmingRepository.actFarm(requirePlayerId(req), action));
}
