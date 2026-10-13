import type { Material } from "#geo/models";

export default {
    id: "bone-meal-blend",
    name: "Bone Meal Blend",
    rarity: "uncommon",
    icon: "powder",
    description: "Ground shell, castings and worse. Makes a tile's soil Rich for good.",
    stats: [{ label: "Soil amendment", value: "Makes a tile Rich: rests to fertility 8" }],
    sellValue: 30,
    skill: "farming",
} satisfies Material;
