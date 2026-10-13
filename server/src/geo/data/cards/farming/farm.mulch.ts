import type { Card } from "#geo/models";

export default {
    id: "farm.mulch",
    name: "Mulch",
    rarity: "uncommon",
    icon: "fertilizer-bag",
    description: "A thick wet layer down the row.",
    stats: [
        { label: "Role", value: "Soil" },
        { label: "Does", value: "1 Labor. The row counts as Boggy soil for 2 cycles: it won't dry out, and earthworms come for it." },
    ],
    skill: "farming",
    maxCharges: 30,
    targets: "self",
} satisfies Card;
