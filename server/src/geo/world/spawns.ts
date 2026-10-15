import { distanceMetres, GEO_WORLD_HABITATS, type GeoPoint, type GeoWorldHabitat, type GeoWorldWaterKind } from "@cozy/shared/geo";
import { CONTENT, GAME_CONFIG } from "../content";
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
    return pointInRing(centre, rng, rng.next() * 2 * Math.PI);
}

/** As randomPointNear, at `bearing` radians clockwise from north. */
function pointInRing(centre: GeoPoint, rng: Rng, bearing: number): GeoPoint {
    const { minSpawnMetres: min, maxSpawnMetres: max } = SPAWN_RULES;
    const distance = Math.sqrt(min * min + rng.next() * (max * max - min * min));
    return offset(centre, distance, bearing);
}

function offset(from: GeoPoint, metres: number, bearing: number): GeoPoint {
    const metresPerDegreeLng = METRES_PER_DEGREE_LAT * Math.cos((from.latitude * Math.PI) / 180);
    return {
        latitude: from.latitude + (metres * Math.cos(bearing)) / METRES_PER_DEGREE_LAT,
        longitude: from.longitude + (metres * Math.sin(bearing)) / metresPerDegreeLng,
    };
}

/**
 * The nearest place of one habitat, as the app sees it on the map (or the
 * server knows it): for water, the nearest edge, and what water it is.
 */
export type NearPlace = GeoPoint & { waterKind?: GeoWorldWaterKind };
export type NearPlaces = Partial<Record<GeoWorldHabitat, NearPlace>>;

type HabitatEntry = { enemyId: string; weight: number; waters?: GeoWorldWaterKind[] };

/** Who lives near each kind of place, from the enemies' own `habitats`. */
export const HABITAT_ENEMIES = Object.fromEntries(
    GEO_WORLD_HABITATS.map((near) => [
        near,
        Object.values(CONTENT.enemies).flatMap((enemy) =>
            (enemy.habitats ?? []).filter((habitat) => habitat.near === near).map(({ weight, waters }) => ({ enemyId: enemy.id, weight, waters })),
        ),
    ]),
) as Record<GeoWorldHabitat, HabitatEntry[]>;

/** How far from the place a spawn beside it may land, in metres. */
const SCATTER_METRES = 8;

/** Spawns facing a place out of reach land within this of its bearing, either side. */
const FACING_SPREAD = Math.PI / 4;

/**
 * Where a new spawn comes from, by weight: the anywhere table has 1, and each
 * nearby place its habitat's `weight`, fading to nothing at its
 * `influenceMetres`. A place pulls only if someone lives there (in that kind
 * of water, for water).
 */
function spawnSources(here: GeoPoint, near: NearPlaces) {
    const sources: { weight: number; table: readonly HabitatEntry[]; place?: NearPlace }[] = [{ weight: 1, table: SPAWN_RULES.enemies }];
    for (const habitat of GEO_WORLD_HABITATS) {
        const place = near[habitat];
        if (!place) continue;
        const { influenceMetres, weight } = SPAWN_RULES.habitats[habitat];
        const pull = weight * (1 - distanceMetres(here, place) / influenceMetres);
        const table = HABITAT_ENEMIES[habitat].filter(
            (entry) => !entry.waters || (place.waterKind !== undefined && entry.waters.includes(place.waterKind)),
        );
        if (pull > 0 && table.length > 0) sources.push({ weight: pull, table, place });
    }
    return sources;
}

/**
 * One new spawn. Nearby places (`near`) pull some toward their own enemies:
 * beside the place when it's within reach, else on the player's side facing
 * it. The rest come from `enemies`, anywhere in the ring.
 */
export function rollSpawn(rng: Rng, here: GeoPoint, near: NearPlaces): { enemyId: string; point: GeoPoint } {
    const source = pickWeighted(spawnSources(here, near), rng.next())!;
    const enemyId = rollEnemyId(rng, source.table);
    if (!source.place) return { enemyId, point: randomPointNear(here, rng) };
    return { enemyId, point: pointToward(source.place, here, rng) };
}

/** Beside `place` if it's in reach (and the spawn stays in reach), else in the ring facing it. */
function pointToward(place: GeoPoint, here: GeoPoint, rng: Rng): GeoPoint {
    if (distanceMetres(here, place) > SPAWN_RULES.maxSpawnMetres) {
        const metresPerDegreeLng = METRES_PER_DEGREE_LAT * Math.cos((here.latitude * Math.PI) / 180);
        const facing = Math.atan2(
            (place.longitude - here.longitude) * metresPerDegreeLng,
            (place.latitude - here.latitude) * METRES_PER_DEGREE_LAT,
        );
        return pointInRing(here, rng, facing + (rng.next() * 2 - 1) * FACING_SPREAD);
    }
    const point = offset(place, rng.next() * SCATTER_METRES, rng.next() * 2 * Math.PI);
    return distanceMetres(here, point) <= SPAWN_RULES.maxSpawnMetres ? point : { latitude: place.latitude, longitude: place.longitude };
}
