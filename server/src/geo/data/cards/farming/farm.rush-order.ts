import type { Card } from "#geo/models";

export default {
    id: "farm.rush-order",
    name: "Rush Order",
    rarity: "rare",
    icon: "scroll-unfurled",
    description: "Tell them it's nearly there. It nearly is.",
    stats: [
        { label: "Role", value: "Tycoon" },
        { label: "Does", value: "1 Labor. Your next order delivery counts one crop more than you hand in." },
    ],
    skill: "farming",
    maxCharges: 10,
    targets: "self",
} satisfies Card;
