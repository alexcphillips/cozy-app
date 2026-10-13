import type { Mutation } from "#geo/models";

// PLACEHOLDER numbers. Recipe: two ripe potatoes beside an empty tile whose soil is Cursed (Cursed Ash, or Hex the Earth for a turn).
export default {
    id: "hexroot",
    name: "Hexroot",
    icon: "plant-roots",
    description: "It grew the wrong way, on purpose.",
    produce: "hexroot",
    stages: 3,
    yield: { min: 1, max: 2 },
    fertilityCost: 2,
    xp: 60,
    recipe: { parents: [{ cropId: "potato", count: 2 }], soil: "cursed" },
    chance: 0.3,
    research: { coins: 300, xp: 80 },
} satisfies Mutation;
