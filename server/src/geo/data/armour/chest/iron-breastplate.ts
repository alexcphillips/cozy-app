import type { Armour } from "#geo/models";

export default {
    id: "iron-breastplate",
    name: "Iron Breastplate",
    rarity: "uncommon",
    icon: "breastplate",
    description: "Dented, but it has kept someone alive before.",
    slot: "chest",
    modifiers: [{ stat: "defence", kind: "flat", value: 9 }],
} satisfies Armour;
