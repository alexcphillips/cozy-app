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
    enemies: [{ enemyId: "spider", weight: 1 }],
} satisfies SpawnsConfig;
