import type { Enemy } from "#geo/models";

export default {
    id: "fungal-slime",
    name: "Fungal Slime",
    sprite: "fungal-slime",
    tier: 1,
    stats: { maxHealth: 40, attack: 12, defence: 0, speed: 12 },
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
    loot: [{ itemId: "slime", chance: 1, quantity: 1 }],
    coins: { min: 1, max: 3 },
    xp: 40,
    habitats: [{ near: "farming", weight: 30 }, { near: "foraging", weight: 10 }],
} satisfies Enemy;
