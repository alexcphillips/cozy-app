import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import express from "express";
import { GEO_API_PATHS, type GeoSession } from "@cozy/shared/geo";
import { IS_PRODUCTION } from "../../config/env";
import { pool } from "../../db";
import { errorHandler, notFoundHandler } from "../../middleware/errorHandler";
import { ensureGeoSchema } from "../db/geo.schema";
import { withTransaction } from "../db/transaction";
import { geoRouter } from "../geo.routes";
import { grantItems } from "../modules/player/geo-player.repository";

/**
 * What every smoke test needs: the geo router on a spare port, a typed call,
 * throwaway accounts, and their clean-up. Smoke tests are dev only — they
 * make real (if short-lived) geo-game accounts.
 */
if (IS_PRODUCTION) throw new Error("geo smoke tests refuse to run in production");

export async function startSmokeServer() {
    const app = express();
    app.use(express.json());
    app.use(geoRouter);
    app.use(notFoundHandler);
    app.use(errorHandler);

    await ensureGeoSchema();
    const server = app.listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const emails: string[] = [];

    async function call<T>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; body: T }> {
        const response = await fetch(base + path, {
            method,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const text = await response.text();
        return { status: response.status, body: (text ? JSON.parse(text) : undefined) as T };
    }

    /** A new geo-game account and its player, signed in. */
    async function registerPlayer(prefix = "smoke"): Promise<GeoSession & { email: string; password: string }> {
        const tag = randomBytes(4).toString("hex");
        const email = `${prefix}-${tag}@geo-smoke.test`;
        const password = `pw-${tag}-long-enough`;
        emails.push(email);
        const response = await call<GeoSession>("POST", GEO_API_PATHS.auth.register, undefined, {
            username: `${prefix}-${tag}`,
            email,
            password,
        });
        if (response.status !== 201) throw new Error(`register failed: ${response.status} ${JSON.stringify(response.body)}`);
        return { ...response.body, email, password };
    }

    /** Puts items straight into a player's inventory, for a test that needs more than the starter kit. */
    async function grant(playerId: string, items: { itemId: string; quantity: number; chargesLeft?: number }[]) {
        return withTransaction((tx) => grantItems(tx, playerId, items));
    }

    /** Deletes the throwaway players, then shuts down. */
    async function stop() {
        server.close();
        // One at a time: deleting a seller refunds their bidders (a trigger),
        // which Postgres refuses when a bidder is deleted by the same statement.
        for (const email of emails) await pool.query(`DELETE FROM geo.players WHERE email = $1`, [email]);
        await pool.end();
    }

    return { call, registerPlayer, grant, stop };
}

export const step = (name: string) => console.log(`✓ ${name}`);
