import type { Card } from "#geo/models";

export default {
    id: "farm.compost-spread",
    name: "Compost Spread",
    rarity: "common",
    icon: "fertilizer-bag",
    description: "Black gold, a shovel at a time.",
    stats: [
        { label: "Role", value: "Soil" },
        { label: "Does", value: "1 Labor. +2 fertility on a tile and the 4 beside it. Spends 2 compost from a Compost Bin." },
    ],
    skill: "farming",
    maxCharges: 40,
    targets: "self",
} satisfies Card;
