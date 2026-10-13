import type { FarmingConfig } from "#geo/models";

// PLACEHOLDER numbers throughout, until a balance pass.
export default {
    laborPerTurn: 3,
    turnHours: 12,
    maxTurnsBanked: 4,
    startTurnsBanked: 2,
    startSize: 3,
    unlockCost: { first: 50, step: 25 },
    seedBagSlots: 2,
    startFertility: 5,
    fallowRecovery: 1,
    fallowCap: 5,
    fertilityYield: { low: 2, high: 8 },
    rotChances: [0.1, 0.2, 0.35, 0.5],
    labor: { water: 1, harvest: 1, clear: 1, swat: 2, cage: 2 },
    pests: { fromTurn: 3, chancePerCrop: 0.08, maxChance: 0.6, max: 4 },
    pollinateBoost: 2,
    weatherWeights: { clear: 4, overcast: 3, rain: 3, heatwave: 1, storm: 0.5, frost: 0.5 },
    weather: {
        heatwaveC: 28,
        frostC: 0,
        rainMm: 2,
        overcastCloud: 75,
        regionDegrees: 0.5,
        homeCooldownDays: 7,
        stormFlattenChance: 0.1,
        frostKillsUpToStage: 1,
    },
} satisfies FarmingConfig;
