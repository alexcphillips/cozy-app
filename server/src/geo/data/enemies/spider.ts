import type { Enemy } from "#geo/models";

export default {
    id: "spider",
    name: "Giant Spider",
    sprite: "spider",
    tier: 1,
    stats: { maxHealth: 18, attack: 10, defence: 0, speed: 13 },
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
        // PLACEHOLDER rate: the rare drop that starts a Tarantula.
        { itemId: "pet.tarantula.common", chance: 0.01, quantity: 1 },
    ],
    coins: { min: 1, max: 4 },
    xp: 40,
} satisfies Enemy;
