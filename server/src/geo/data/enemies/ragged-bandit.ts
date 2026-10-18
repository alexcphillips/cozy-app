import type { Enemy } from "#geo/models";

export default {
    id: "ragged-bandit",
    name: "Ragged Bandit",
    sprite: "ragged-bandit",
    tier: 5,
    stats: { maxHealth: 16, attack: 14, defence: 0, speed: 10 },
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
    loot: [{ itemId: "bones", chance: 1, quantity: { min: 1, max: 1 } }],
    coins: { min: 1, max: 3 },
    xp: 40,
} satisfies Enemy;
