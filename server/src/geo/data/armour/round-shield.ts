import type { Armour } from "#geo/models";

export default {
    id: "round-shield",
    name: "Round Shield",
    rarity: "common",
    icon: "round-shield",
    description: "Banded oak with an iron boss.",
    slot: "offHand",
    modifiers: [{ stat: "defence", kind: "flat", value: 6 }],
    unlocksCards: ["guard"],
} satisfies Armour;
