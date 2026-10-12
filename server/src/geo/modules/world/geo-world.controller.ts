import type { Request, Response } from "express";
import { isValidPoint, type GeoDevSpawnRequest, type GeoPoint, type GeoWorldResponse } from "@cozy/shared/geo";
import { IS_PRODUCTION } from "../../../config/env";
import { CONTENT } from "../../content";
import { AppError } from "../../../http/AppError";
import { requirePlayerId } from "../../middleware/geo-auth";
import { SPAWN_RULES } from "../../world";
import * as worldRepository from "./geo-world.repository";

/**
 * Enemies around the player, placed for them alone; other players are never
 * shown. Of the position, only the latest point is kept, overwritten as they
 * move, to tell walking from sitting (geo/world/travel.ts); the spawns placed
 * near it last minutes, then are deleted.
 */
export async function getWorld(req: Request, res: Response) {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const here = { latitude, longitude };
    if (!isValidPoint(here)) throw AppError.badRequest("latitude and longitude are required");

    const fill = !IS_PRODUCTION && req.query.fill === "true";
    res.status(200).json(await worldReply(requirePlayerId(req), here, fill));
}

async function worldReply(playerId: string, here: GeoPoint, fill: boolean): Promise<GeoWorldResponse> {
    return {
        spawns: await worldRepository.spawnsAround(playerId, here, Date.now(), fill),
        reachMetres: SPAWN_RULES.reachMetres,
        // The ring the app draws: every spawn is inside it, all in reach.
        spawnRadiusMetres: SPAWN_RULES.reachMetres,
    };
}

/** Dev servers only: an enemy within reach now, e.g. the test dragon. */
export async function devSpawn(req: Request, res: Response) {
    if (IS_PRODUCTION) throw AppError.notFound("Not found");
    const { enemyId, latitude, longitude } = (req.body ?? {}) as Partial<GeoDevSpawnRequest>;
    const here = { latitude, longitude };
    if (typeof enemyId !== "string" || !CONTENT.enemies[enemyId]) throw AppError.badRequest("Unknown enemy");
    if (!isValidPoint(here)) throw AppError.badRequest("latitude and longitude are required");

    const playerId = requirePlayerId(req);
    await worldRepository.addSpawn(playerId, enemyId, here, Date.now());
    res.status(201).json(await worldReply(playerId, here, false));
}
