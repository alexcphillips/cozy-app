import type { Enemy } from "#geo/models";

export default {
    id: "fungal-slime",
    name: "Fungal Slime",
    sprite: "fungal-slime",
    tier: 5,
    stats: { maxHealth: 26, attack: 12, defense: 1, speed: 10 },
    barrier: 8,
    moves: [
        {
            id: "bite",
            name: "Bite",
            weight: 1,
            actions: [
                {
                    type: "attack",
                    to: "other",
                    amount: { stat: "attack" },
                    delivery: "melee",
                },
            ],
        },
    ],
    loot: [{ itemId: "slime", chance: 1, quantity: { min: 1, max: 1 } }],
    coins: { min: 1, max: 3 },
    xp: 40,
    habitats: [
        { near: "farming", weight: 30 },
        { near: "foraging", weight: 10 },
    ],
} satisfies Enemy;
