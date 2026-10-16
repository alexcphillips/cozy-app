import type { StarterKitConfig } from "#geo/models";

export default {
    items: [
        { itemId: "bronze-dagger", quantity: 1 },
        { itemId: "card.slash", quantity: 1 },
        { itemId: "card.double-slash", quantity: 1 },
        { itemId: "card.fish.reel", quantity: 1 },
        { itemId: "card.fish.slack", quantity: 1 },
        { itemId: "card.fish.steady", quantity: 1 },
        { itemId: "card.fish.gaff", quantity: 1 },
        { itemId: "card.farm.bucket-line", quantity: 1 },
        { itemId: "card.farm.careful-pick", quantity: 1 },
        { itemId: "card.farm.plow-under", quantity: 1 },
        { itemId: "card.farm.read-sky", quantity: 1 },
        { itemId: "card.farm.smoke", quantity: 1 },
        { itemId: "wheat-seeds", quantity: 12 },
        { itemId: "carrot-seeds", quantity: 6 },
    ],
    equip: { mainHand: "bronze-dagger" },
    handSkills: ["combat", "fishing", "farming"],
    lunchbox: [{ itemId: "bread", quantity: 5 }],
    bait: [{ itemId: "worm-bait", quantity: 20 }],
} satisfies StarterKitConfig;
