import type { Pest } from "#geo/models";

// PLACEHOLDER numbers. Drains 2 fertility a turn; moves to richer soil once a tile is spent.
export default {
    id: "earthworm",
    name: "Earthworm",
    icon: "earth-worm",
    description: "Leaves the crops alone and eats the soil out from under them.",
    likes: ["melon", "carrot"],
    behaviour: { kind: "drain", amount: 2 },
    weight: 1,
    soils: ["boggy"],
    drops: [
        { itemId: "worm-castings", chance: 1, quantity: { min: 1, max: 2 } },
        { itemId: "golden-scarab", chance: 0.03, quantity: { min: 1, max: 1 } },
    ],
    xp: 5,
    bounty: 1,
} satisfies Pest;
