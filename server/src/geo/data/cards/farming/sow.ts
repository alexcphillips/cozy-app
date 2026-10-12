import type { Card } from "#geo/models";

// PLACEHOLDER: farming has no Runs yet, so this does nothing.
export default {
    id: "sow",
    name: "Sow",
    rarity: "common",
    icon: "wheat",
    description: "Plant what you brought. Patience does the rest.",
    stats: [{ label: "Growth", value: "+1" }],
    skill: "farming",
    maxCharges: 200,
    targets: "self",
} satisfies Card;
