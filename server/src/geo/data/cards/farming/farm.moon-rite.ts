import type { Card } from "#geo/models";

export default {
    id: "farm.moon-rite",
    name: "Moon Rite",
    rarity: "rare",
    icon: "evil-moon",
    description: "Call the red moon early.",
    stats: [
        { label: "Role", value: "Ritual" },
        { label: "Does", value: "2 Labor. The next turn comes under a Blood Moon: Blood Moon recipes can sprout, and pests come twice as often." },
    ],
    skill: "farming",
    maxCharges: 10,
    targets: "self",
} satisfies Card;
