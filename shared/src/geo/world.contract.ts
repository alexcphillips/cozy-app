/** An enemy on the map, as `GET /geo/world` lists it. */
export type GeoSpawn = {
    /** Pass back to `POST /geo/runs` to fight it. */
    id: string;
    enemyId: string;
    /** The app's sprite name. */
    sprite: string;
    latitude: number;
    longitude: number;
    /** ISO time it leaves the map. */
    despawnsAt: string;
};

/**
 * `POST /geo/dev/spawns`, dev servers only: an enemy within reach of this
 * point, straight away. Replies like `GET /geo/world`.
 */
export type GeoDevSpawnRequest = {
    enemyId: string;
    latitude: number;
    longitude: number;
};

/**
 * `GET /geo/world?latitude=…&longitude=…`. Dev servers also take `fill=true`:
 * top up to the most spawns allowed rather than this window's roll.
 */
export type GeoWorldResponse = {
    spawns: GeoSpawn[];
    /** How close the player must be to start a fight, in metres. */
    reachMetres: number;
    /** How far from the player new spawns appear, in metres. */
    spawnRadiusMetres: number;
};
