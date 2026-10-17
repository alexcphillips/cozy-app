import type { Enemy } from "#geo/models";

export default {
    id: "executioner",
    name: "Executioner",
    sprite: "executioner",
    tier: 1,
    stats: { maxHealth: 53, attack: 38, defence: 16, speed: 17 },
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
    loot: [
        { itemId: "spider-fang", chance: 1, quantity: 1 },
        { itemId: "silk-spool", chance: 0.5, quantity: 1 },
    ],
    coins: { min: 1, max: 4 },
    xp: 40,
} satisfies Enemy;
