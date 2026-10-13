import type { Card } from "#geo/models";

export default {
    id: "farm.deep-soak",
    name: "Deep Soak",
    rarity: "uncommon",
    icon: "water-drop",
    description: "Water it until the ground can't take any more.",
    stats: [
        { label: "Role", value: "Water" },
        { label: "Does", value: "2 Labor. Moisture to full, and growing here drinks nothing for 2 cycles." },
    ],
    skill: "farming",
    maxCharges: 30,
    targets: "self",
} satisfies Card;
