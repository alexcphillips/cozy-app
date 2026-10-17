import type { Enemy } from "#geo/models";

export default {
    id: "bandit-archer",
    name: "Bandit Archer",
    sprite: "bandit-archer",
    tier: 1,
    stats: { maxHealth: 19, attack: 21, defence: 1, speed: 12 },
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
