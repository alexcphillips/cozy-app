import type { Vendor } from "#geo/models";

export default {
    id: "blacksmith",
    name: "Blacksmith",
    icon: "anvil",
    description: "Plain, honest steel for anyone heading out. For a price she'll rework what you've got.",
    sells: [
        { itemId: "bronze-dagger", price: 50, tab: "Weapons" },
        { itemId: "broadsword", price: 150, tab: "Weapons" },
        { itemId: "pointy-sword", price: 300, tab: "Weapons" },
        { itemId: "round-shield", price: 120, tab: "Armour" },
        { itemId: "leather-gloves", price: 60, tab: "Armour" },
        { itemId: "iron-helm", price: 120, tab: "Armour" },
        { itemId: "iron-greaves", price: 250, tab: "Armour" },
        { itemId: "iron-breastplate", price: 350, tab: "Armour" },
        { itemId: "card.slash", price: 40, tab: "Cards" },
        { itemId: "card.double-slash", price: 40, tab: "Cards" },
        { itemId: "card.barrier", price: 60, tab: "Cards" },
    ],
    buys: { kinds: ["equipment"] },
    // Coins per reroll, by the item's rarity.
    reforge: { cost: { common: 100, uncommon: 250, rare: 1000, epic: 4000, legendary: 15000 } },
} satisfies Vendor;
