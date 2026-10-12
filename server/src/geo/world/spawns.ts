import type { GeoPoint } from "@cozy/shared/geo";
import { GAME_CONFIG } from "../content";
import type { Rng } from "../engine/rng";

/**
 * Enemy spawns — per player, placed around them.
 *
 * Each player has their own small set of spawns, made around where they are
 * when the app asks (`GET /geo/world`) and stored only while they last. A
 * spawn stays put; walk out of its reach and it despawns 45 seconds later
 * (unless you come back), and new ones trickle in, one at a time, around where
 * the player is now.
 *
 * All numbers are PLACEHOLDERS to tune, in `data/config/spawns.ts`.
 */
/**
 * New spawns appear only within reach (`reachMetres`), so whatever turns up —
 * on opening the game or later — can be fought where you stand. The app's
 * ring shows this same reach. Walk away from one and it lingers a short
 * while (`outOfReachSeconds`), then despawns.
 */
export const SPAWN_RULES = {
    ...GAME_CONFIG.spawns,
    /** New spawns land at most this far from the player: within reach. */
    maxSpawnMetres: GAME_CONFIG.spawns.reachMetres,
};

export const MAX_SPAWNS = SPAWN_RULES.countWeights.length;

const WINDOW_MS = SPAWN_RULES.windowMinutes * 60_000;

export const windowAt = (time: number) => Math.floor(time / WINDOW_MS);

function pickWeighted<T extends { weight: number }>(list: readonly T[], roll: number): T | undefined {
    const total = list.reduce((sum, entry) => sum + entry.weight, 0);
    let left = roll * total;
    for (const entry of list) {
        left -= entry.weight;
        if (left < 0) return entry;
    }
    return list.at(-1);
}

/** How many spawns a player should have this window: 1 to MAX_SPAWNS. */
export function rollSpawnCount(rng: Rng): number {
    const weights = SPAWN_RULES.countWeights.map((weight, index) => ({ weight, count: index + 1 }));
    return pickWeighted(weights, rng.next())?.count ?? 1;
}

/** Picks an enemy from a weighted table: SPAWN_RULES.enemies unless told otherwise. */
export function rollEnemyId(
    rng: Rng,
    table: readonly { enemyId: string; weight: number }[] = SPAWN_RULES.enemies,
): string {
    return pickWeighted(table, rng.next())?.enemyId ?? SPAWN_RULES.enemies[0]?.enemyId ?? "";
}

/** How long a new spawn lasts, in ms. */
export function rollLifetimeMs(rng: Rng): number {
    const { min, max } = SPAWN_RULES.lifetimeMinutes;
    return (min + rng.next() * (max - min)) * 60_000;
}

const METRES_PER_DEGREE_LAT = 111_320;

/**
 * A random point between minSpawnMetres and maxSpawnMetres from `centre`,
 * spread evenly over that ring (not bunched near the middle).
 */
export function randomPointNear(centre: GeoPoint, rng: Rng): GeoPoint {
    const { minSpawnMetres: min, maxSpawnMetres: max } = SPAWN_RULES;
    const distance = Math.sqrt(min * min + rng.next() * (max * max - min * min));
    const bearing = rng.next() * 2 * Math.PI;
    const metresPerDegreeLng = METRES_PER_DEGREE_LAT * Math.cos((centre.latitude * Math.PI) / 180);
    return {
        latitude: centre.latitude + (distance * Math.cos(bearing)) / METRES_PER_DEGREE_LAT,
        longitude: centre.longitude + (distance * Math.sin(bearing)) / metresPerDegreeLng,
    };
}
