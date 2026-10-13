import type { Material } from "#geo/models";

export default {
    id: "peat-bale",
    name: "Peat Bale",
    rarity: "uncommon",
    icon: "stone-pile",
    description: "Dark, wet and heavy. Makes a tile's soil Boggy for good.",
    stats: [{ label: "Soil amendment", value: "Makes a tile Boggy: never dries out; earthworms love it" }],
    sellValue: 20,
    skill: "farming",
} satisfies Material;
