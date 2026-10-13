import type { Vendor } from "#geo/models";

export default {
    id: "farmer",
    name: "Farmer",
    icon: "farmer",
    description: "Sells seeds and a few tricks of the trade, and buys back anything grown or sown.",
    sells: [
        { itemId: "wheat-seeds", price: 2 },
        { itemId: "carrot-seeds", price: 3 },
        { itemId: "seed-potato", price: 4 },
        { itemId: "pumpkin-seeds", price: 8 },
        { itemId: "melon-seeds", price: 12 },
        { itemId: "wheat", price: 5 },
        { itemId: "card.farm.bucket-line", price: 40 },
        { itemId: "card.farm.careful-pick", price: 40 },
        { itemId: "card.farm.green-manure", price: 40 },
        { itemId: "card.farm.read-sky", price: 40 },
        { itemId: "card.farm.deep-soak", price: 120 },
        { itemId: "card.farm.scythe-sweep", price: 150 },
        { itemId: "card.farm.ripen", price: 150 },
        { itemId: "card.farm.hold", price: 120 },
    ],
    buys: { kinds: ["material"], skills: ["farming"] },
} satisfies Vendor;
