import type { Armour } from "#geo/models";

export default {
    id: "leather-gloves",
    name: "Leather Gloves",
    rarity: "common",
    icon: "gauntlet",
    description: "Soft at the palm, so the card never slips.",
    slot: "hands",
    modifiers: [{ stat: "defence", kind: "flat", value: 2 }],
} satisfies Armour;
