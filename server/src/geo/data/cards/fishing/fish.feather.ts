import type { Card } from "#geo/models";

export default {
    id: "fish.feather",
    name: "Feather the Drag",
    rarity: "uncommon",
    icon: "feather",
    description: "A light touch on the spool.",
    stats: [
        { label: "Role", value: "Control" },
        { label: "Does", value: "After the fish moves, Tension settles mid-zone. +1 Finesse." },
    ],
    skill: "fishing",
    maxCharges: 15,
    finesse: "raises",
    targets: "self",
} satisfies Card;
