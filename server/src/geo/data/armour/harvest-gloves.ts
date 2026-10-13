import type { Armour } from "#geo/models";

// PLACEHOLDER numbers, until a balance pass.
export default {
    id: "harvest-gloves",
    name: "Harvest Gloves",
    rarity: "rare",
    icon: "gauntlet",
    description: "Stained green to the wrist. Nothing slips through them.",
    slot: "hands",
    stats: [{ label: "Farming Fortune", value: "+25" }],
    modifiers: [{ stat: "farmingFortune", kind: "flat", value: 25 }],
} satisfies Armour;
