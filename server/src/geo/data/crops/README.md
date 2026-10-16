# Crops

Crops that grow on the farm. A crop's seed and what it gives are ordinary
`farming` materials with files of their own in `materials/farming/`, so a
crop file just points at them. Each seed grows exactly one crop, and is
planted straight from the inventory.

## Fields

Model: `Crop` in `#geo/models` (`content/models.ts`). Hover any field in the editor for the same help.

| Field | Type | Required? | What it does |
| --- | --- | --- | --- |
| `id` | text | yes | Matches the file name. |
| `name`, `icon` | text | yes | Shown in the app. |
| `seed` | item id | yes | The farming material planted from the inventory. |
| `produce` | item id | yes | The farming material a harvest gives. |
| `stages` | whole number ≥ 1 | yes | Turns from planting to ripe. Each needs water, unless the tile is soaked or the sky is overcast. |
| `yield` | `{ min, max }` | yes | How many `produce` a harvest gives, before fertility, waiting and card bonuses. |
| `seedsBack` | `{ min, max }` | yes | Seeds a harvest gives back. |
| `fertilityCost` | whole number ≥ 0 | yes | Fertility a harvest takes from its tile. |
| `xp` | whole number ≥ 0 | yes | Farming XP per harvest. |

Turns, Labor, rot chances, fertility rules and the placeholder weather are in
[`config/farming.ts`](../config/README.md#farmingts).
