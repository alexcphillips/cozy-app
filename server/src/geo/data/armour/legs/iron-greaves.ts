import type { Armour } from "#geo/models";

export default {
    id: "iron-greaves",
    name: "Iron Greaves",
    rarity: "uncommon",
    icon: "greaves",
    description: "Loud on stairs. Quiet in a fight, where it counts.",
    slot: "legs",
    modifiers: [{ stat: "defence", kind: "flat", value: 6 }],
} satisfies Armour;
