import type { Armour } from "#geo/models";

export default {
    id: "iron-helm",
    name: "Iron Helm",
    rarity: "common",
    icon: "visored-helm",
    description: "Heavy, hot, and very hard to argue with.",
    slot: "head",
    modifiers: [{ stat: "defence", kind: "flat", value: 5 }],
} satisfies Armour;
