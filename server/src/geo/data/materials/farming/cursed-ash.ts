import type { Material } from "#geo/models";

export default {
    id: "cursed-ash",
    name: "Cursed Ash",
    rarity: "rare",
    icon: "powder",
    description: "What the Shrine leaves when it keeps your offering. Makes a tile's soil Cursed for good.",
    stats: [{ label: "Soil amendment", value: "Makes a tile Cursed: plain crops yield 1 less; some mutations need it" }],
    sellValue: 40,
    skill: "farming",
} satisfies Material;
