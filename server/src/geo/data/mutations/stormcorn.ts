import type { Mutation } from "#geo/models";

// PLACEHOLDER numbers. Recipe: a ripe Corn beside the empty tile, a Lightning Rod beside it too, during a Storm.
export default {
    id: "stormcorn",
    name: "Stormcorn",
    icon: "lightning-storm",
    description: "Every kernel crackles. Don't eat it near anything metal.",
    produce: "stormcorn",
    stages: 4,
    yield: { min: 1, max: 2 },
    fertilityCost: 3,
    xp: 70,
    recipe: { parents: [{ cropId: "corn", count: 1 }], weather: "storm", structure: "lightning-rod" },
    chance: 0.3,
    research: { coins: 400, xp: 100 },
} satisfies Mutation;
