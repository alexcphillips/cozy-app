import type { Crop } from "#geo/models";

// PLACEHOLDER numbers. Tall and steady; the Lightning Rod's partner (Stormcorn).
export default {
    id: "corn",
    name: "Corn",
    icon: "corn",
    seed: "corn-seeds",
    produce: "corn",
    stages: 4,
    yield: { min: 2, max: 3 },
    seedsBack: { min: 1, max: 2 },
    fertilityCost: 2,
    xp: 15,
} satisfies Crop;
