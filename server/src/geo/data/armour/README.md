# Armour and shields

Everything worn that isn't a main-hand weapon, a ring or an amulet: shields
(off hand), helmets, shoulders, chest pieces, gloves, leg armour, boots, cloaks and belts.

## Fields

Model: `Armour` in `#geo/models` (`content/models.ts`). Hover any field in the editor for the same help.

Plus the [fields every item has](../README.md#fields-every-item-has).

| Field | Type | Required? | What it does |
| --- | --- | --- | --- |
| `slot` | `offHand` `head` `shoulders` `chest` `hands` `legs` `feet` `cloak` `belt` | yes | Where it's worn. Shields are `offHand`. |
| `modifiers` | list of [modifiers](../EFFECTS.md#modifiers) | no | Stats while worn, e.g. +6 defence. |
| `effects` | list of [effects](../EFFECTS.md#effects-when-x-if-y-maybe-do-z) | no | Procs and passives while worn. |
| `unlocksCards` | list of card ids | no | Cards only usable while this is worn, e.g. a shield's `guard`. |

## Example: a shield

```ts
import type { Armour } from "#geo/models";

export default {
    id: "spiked-buckler",
    name: "Spiked Buckler",
    rarity: "uncommon",
    icon: "spiked-shield",
    description: "Small, round, and rude.",
    slot: "offHand",
    modifiers: [{ stat: "defence", kind: "flat", value: 4 }],
    effects: [
        {
            id: "spiked-buckler.thorns",
            trigger: { event: "attacked", as: "target" },
            actions: [{ type: "damage", to: "other", amount: 2, ignoreDefence: true }],
        },
    ],
    unlocksCards: ["guard"],
    effectText: ["Attackers take 2 damage"],
} satisfies Armour;
```

## Example: a helmet

```ts
import type { Armour } from "#geo/models";

export default {
    id: "steel-helm",
    name: "Steel Helm",
    rarity: "uncommon",
    icon: "visored-helm",
    description: "Polished enough to see yourself in. Worth it.",
    slot: "head",
    modifiers: [{ stat: "defence", kind: "flat", value: 7 }, { stat: "maxHealth", kind: "flat", value: 10 }],
} satisfies Armour;
```
