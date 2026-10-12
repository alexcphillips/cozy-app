import type { Card } from "#geo/models";

export default {
    id: "double-slash",
    name: "Double Slash",
    rarity: "common",
    icon: "plain-dagger",
    description: "In and out twice before they've noticed the first.",
    stats: [{ label: "Damage", value: "60% of Attack, twice" }],
    skill: "combat",
    maxCharges: 60,
    targets: "enemy",
    requiresWeapon: ["dagger"],
    actions: [
        {
            type: "attack",
            to: "other",
            amount: { stat: "attack", multiplier: 0.6 },
            hits: 2,
            delivery: "melee",
        },
    ],
} satisfies Card;
