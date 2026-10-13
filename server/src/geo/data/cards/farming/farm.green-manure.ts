import type { Card } from "#geo/models";

export default {
    id: "farm.green-manure",
    name: "Green Manure",
    rarity: "common",
    icon: "sprout",
    description: "Dig it back in. The soil remembers.",
    stats: [
        { label: "Role", value: "Soil" },
        { label: "Does", value: "1 Labor. Destroys whatever grows on the tile for +3 fertility." },
    ],
    skill: "farming",
    maxCharges: 40,
    targets: "self",
} satisfies Card;
