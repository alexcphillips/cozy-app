import type { Card } from "#geo/models";

export default {
    id: "farm.read-sky",
    name: "Read the Sky",
    rarity: "common",
    icon: "sun-cloud",
    description: "Red sky at night.",
    stats: [
        { label: "Role", value: "Info" },
        { label: "Does", value: "1 Labor. The forecast shows the next 3 Advances until you Advance." },
    ],
    skill: "farming",
    maxCharges: 40,
    targets: "self",
} satisfies Card;
