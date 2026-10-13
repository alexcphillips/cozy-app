import type { Talisman } from "#geo/models";

// PLACEHOLDER numbers, until a balance pass.
export default {
    id: "four-leaf-clover",
    name: "Four-Leaf Clover",
    rarity: "uncommon",
    icon: "clover",
    description: "Found in a field of three-leaf ones. The field noticed.",
    stats: [{ label: "Farming Fortune", value: "+10" }],
    modifiers: [{ stat: "farmingFortune", kind: "flat", value: 10 }],
} satisfies Talisman;
