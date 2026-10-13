import type { Card } from "#geo/models";

export default {
    id: "farm.ripen",
    name: "Ripen",
    rarity: "uncommon",
    icon: "sun",
    description: "Coax it along, at the soil's expense.",
    stats: [
        { label: "Role", value: "Grow" },
        { label: "Does", value: "2 Labor. A growing crop moves one stage now. Its tile loses 1 fertility." },
    ],
    skill: "farming",
    maxCharges: 25,
    targets: "self",
} satisfies Card;
