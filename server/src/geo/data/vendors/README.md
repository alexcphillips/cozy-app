# Vendors

NPC shops in the Town Hub. A vendor sells a fixed list at fixed prices, and
buys anything its `buys` rule accepts, paying the item's `sellValue`.

## Fields

Model: `Vendor` in `#geo/models` (`content/models.ts`). Hover any field in the editor for the same help.

| Field | Type | Required? | What it does |
| --- | --- | --- | --- |
| `id`, `name`, `icon`, `description` | text | yes | Shown in the app. |
| `sells` | list of `{ itemId, price }` | yes | Coins each, unlimited stock. Can be empty. |
| `buys` | `{ kinds?, skills?, itemIds? }` | yes | Buys items that match **every** rule given. `{}` buys everything not Soulbound. |
| `buys.kinds` | list of `card` `equipment` `talisman` `material` `consumable` `misc` | no | |
| `buys.skills` | list of skills | no | Matches cards and materials of these skills. |
| `buys.itemIds` | list of item ids | no | Only these items. |

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
    sells: [{ itemId: "bronze-dagger", price: 50 }, { itemId: "iron-helm", price: 120 }],
    buys: { kinds: ["material"], skills: ["mining"] },
} satisfies Vendor;
```
