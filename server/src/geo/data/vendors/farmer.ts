import type { Vendor } from "#geo/models";

export default {
    id: "farmer",
    name: "Farmer",
    icon: "farmer",
    description: "Sells wheat by the sheaf, and buys back anything grown or sown.",
    sells: [{ itemId: "wheat", price: 5 }],
    buys: { kinds: ["material"], skills: ["farming"] },
} satisfies Vendor;
