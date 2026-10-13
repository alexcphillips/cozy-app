import type { Card } from "#geo/models";

export default {
    id: "farm.hex-the-earth",
    name: "Hex the Earth",
    rarity: "uncommon",
    icon: "evil-moon",
    description: "A few words the soil won't forget for a while.",
    stats: [
        { label: "Role", value: "Soil" },
        { label: "Does", value: "1 Labor. One tile counts as Cursed soil for 1 turn: plain crops there yield 1 less, but some mutations want it." },
    ],
    skill: "farming",
    maxCharges: 20,
    targets: "self",
} satisfies Card;
