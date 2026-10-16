# Vendors

NPC shops in the Town Hub. A vendor sells a fixed list at fixed prices, and
buys anything its `buys` rule accepts, paying the item's `sellValue`.

## Fields

Model: `Vendor` in `#geo/models` (`content/models.ts`). Hover any field in the editor for the same help.

| Field | Type | Required? | What it does |
| --- | --- | --- | --- |
| `id`, `name`, `icon`, `description` | text | yes | Shown in the app. |
| `sells` | list of `{ itemId, price, tab? }` | yes | Coins each, unlimited stock. Can be empty. `tab` lists it under its own buy tab ("Weapons"); untabbed offers go under "Buy". |
| `buys` | `{ kinds?, skills?, itemIds? }` | yes | Buys items that match **every** rule given. `{}` buys everything not Soulbound. |
| `buys.kinds` | list of `card` `equipment` `talisman` `material` `consumable` `misc` `pet` `petItem` | no | |
| `buys.skills` | list of skills | no | Matches cards and materials of these skills. |
| `buys.itemIds` | list of item ids | no | Only these items. |
| `reforge` | `{ cost: { common, uncommon, rare, epic, legendary } }` | no | Gives the vendor a Reforge tab: coins per reroll by the item's rarity. See [reforges](../reforges/README.md). |
| `petUpgrades` | `true` | no | Gives the vendor a Pets tab to raise a pet one rarity, at the pet's Kat price (see [pets](../pets/README.md)). |

The server refuses to start if anything sells for less than some vendor
pays for it, which would print coins. The mayor's `vendorPrices` perks
change prices but never go under that floor.

## Example

```ts
import type { Vendor } from "#geo/models";

export default {
    id: "blacksmith",
    name: "Blacksmith",
    icon: "anvil",
    description: "Sells what she makes. Buys what you dig up.",
    sells: [
        { itemId: "bronze-dagger", price: 50, tab: "Weapons" },
        { itemId: "iron-helm", price: 120, tab: "Armour" },
    ],
    buys: { kinds: ["equipment"] },
    reforge: { cost: { common: 100, uncommon: 250, rare: 1000, epic: 4000, legendary: 15000 } },
} satisfies Vendor;
```
