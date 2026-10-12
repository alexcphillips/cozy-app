import type { Bait } from "#geo/models";

// PLACEHOLDER: scent isn't read by any rule yet; chum is.
export default {
    id: "chum-slick",
    name: "Chum Slick",
    rarity: "rare",
    icon: "fishing-hook",
    description: "Cloud the water. Bigger things notice.",
    stats: [{ label: "Scent", value: "+3" }],
    effectText: ["Rare fish more likely for 2 casts"],
    scent: 3,
    chum: true,
} satisfies Bait;
