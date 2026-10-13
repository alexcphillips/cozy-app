import type { Card } from "#geo/models";

export default {
    id: "farm.lime-dust",
    name: "Lime Dust",
    rarity: "uncommon",
    icon: "powder",
    description: "It locks the soil up tight. Nothing goes out; nothing grows either.",
    stats: [
        { label: "Role", value: "Soil" },
        { label: "Does", value: "1 Labor. A 3×3 can't lose fertility until the next cycle is done, but its crops don't grow on it." },
    ],
    skill: "farming",
    maxCharges: 30,
    targets: "self",
} satisfies Card;
