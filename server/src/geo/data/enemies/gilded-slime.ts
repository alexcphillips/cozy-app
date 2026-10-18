import type { Enemy } from "#geo/models";

export default {
    id: "gilded-slime",
    name: "Gilded Slime",
    sprite: "gilded-slime",
    tier: 5,
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
    loot: [{ itemId: "slime", chance: 1, quantity: { min: 1, max: 1 } }],
    coins: { min: 25, max: 60 },
    xp: 60,
} satisfies Enemy;
