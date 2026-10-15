import type { SpawnsConfig } from "#geo/models";

export default {
    reachMetres: 50,
    minSpawnMetres: 10,
    outOfReachSeconds: 45,
    respawnAfterWinSeconds: 60,
    countWeights: [40, 30, 17, 9, 4],
    windowMinutes: 15,
    spawnGapSeconds: 180,
    lifetimeMinutes: { min: 4, max: 8 },
    enemies: [
        { enemyId: "spider", weight: 10 },
        { enemyId: "green-slime", weight: 10 },
        // Rare, coin-rich.
        { enemyId: "gilded-slime", weight: 1 },
    ],
    // PLACEHOLDER pulls. Each new spawn picks where it's from by weight:
    // `enemies` above has 1; a place nearby has its `weight` when you're on
    // it, fading to nothing at `influenceMetres`. Who lives where is on each
    // enemy, as `habitats`.
    habitats: {
        // Kept within reachMetres, so water creatures always land on the shore.
        water: { influenceMetres: 50, weight: 0.7 },
        mining: { influenceMetres: 150, weight: 1.5 },
        foraging: { influenceMetres: 150, weight: 1 },
        farming: { influenceMetres: 150, weight: 1 },
        landmark: { influenceMetres: 120, weight: 0.8 },
    },
} satisfies SpawnsConfig;
