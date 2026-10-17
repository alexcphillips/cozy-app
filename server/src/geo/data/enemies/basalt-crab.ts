import type { Enemy } from "#geo/models";

export default {
    id: "basalt-crab",
    name: "Basalt Crab",
    sprite: "basalt-crab",
    tier: 1,
    stats: {
        maxHealth: 65,
        attack: 16,
        defence: 10,
        speed: 12,
        counterChance: 0.25,
    },
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
