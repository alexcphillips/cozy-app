import type { Card } from "#geo/models";

export default {
    id: "farm.hold",
    name: "Hold",
    rarity: "uncommon",
    icon: "hourglass",
    description: "Wrap it up and keep it as it is.",
    stats: [
        { label: "Role", value: "Harvest" },
        { label: "Does", value: "1 Labor. A ripe crop neither rots nor improves on the next turn." },
    ],
    skill: "farming",
    maxCharges: 30,
    targets: "self",
} satisfies Card;
