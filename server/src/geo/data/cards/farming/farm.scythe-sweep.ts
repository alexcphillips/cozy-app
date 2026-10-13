import type { Card } from "#geo/models";

export default {
    id: "farm.scythe-sweep",
    name: "Scythe Sweep",
    rarity: "uncommon",
    icon: "scythe",
    description: "One wide swing takes the lot.",
    stats: [
        { label: "Role", value: "Harvest" },
        { label: "Does", value: "2 Labor. Harvest every ripe crop in a 3×3, each −1 yield." },
    ],
    skill: "farming",
    maxCharges: 30,
    targets: "self",
} satisfies Card;
