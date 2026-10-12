import type { NextFunction, Request, Response } from "express";
import type { GeoRole } from "@cozy/shared/geo";
import { query } from "../../db";
import { AppError } from "../../http/AppError";
import { verifyAccessToken } from "../lib/geo-tokens";

type AccessRow = { role: GeoRole; banned_at: Date | null };

/**
 * Populates `req.geoPlayerId` and `req.geoRole` from a geo-game bearer token,
 * or rejects. The geo counterpart of cozy-app's `auth`; the two never accept
 * each other's tokens.
 *
 * The player is read on every request, so a ban or a role change counts at
 * once rather than when the hour-long access token runs out.
 */
export async function geoAuth(req: Request, _res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(AppError.unauthorized("Missing token"));

    let playerId: string;
    try {
        playerId = verifyAccessToken(token).playerId;
    } catch {
        return next(AppError.unauthorized("Invalid token"));
    }

    try {
        const [row] = await query<AccessRow>(`SELECT role, banned_at FROM geo.players WHERE id = $1`, [playerId]);
        if (!row) return next(AppError.unauthorized("Invalid token"));
        if (row.banned_at) return next(AppError.forbidden("This account has been suspended"));
        req.geoPlayerId = playerId;
        req.geoRole = row.role;
        next();
    } catch (error) {
        next(error);
    }
}

/** After `geoAuth`: game admins only. cozy-app's own admins are not game admins. */
export function geoAdmin(req: Request, _res: Response, next: NextFunction) {
    if (req.geoRole !== "admin") return next(AppError.forbidden("Admin access required"));
    next();
}

/** For controllers behind `geoAuth`. */
export function requirePlayerId(req: Request): string {
    const id = req.geoPlayerId;
    if (!id) throw AppError.unauthorized("Missing token");
    return id;
}
