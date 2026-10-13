# Pests

Pests are pieces on the farm grid. Each comes for the crops it `likes`,
shows its next move before it happens, and acts when the player presses
Advance. The player answers with Swat (a plain action) or pest-control cards
(Smoke, Bait Ring, Snap Trap). A cleared pest rolls its `drops`.

When and how often pests spawn is in
[`config/farming.ts`](../config/README.md#farmingts) (`pests`).

## Fields

Model: `Pest` in `#geo/models` (`content/models.ts`). Hover any field in the editor for the same help.

| Field | Type | Required? | What it does |
| --- | --- | --- | --- |
| `id` | text | yes | Matches the file name. |
| `name`, `icon`, `description` | text | yes | Shown in the app. |
| `likes` | crop ids | yes | It only spawns while one of these grows, next to it, and goes for them first. |
| `behaviour` | one of below | yes | How it acts on Advance. |
| `weight` | number > 0 | yes | How likely it is to be the pest that spawns, per liked crop growing. |
| `drops` | `{ itemId, chance, quantity }[]` | yes | Each rolled on its own when it's cleared; `chance` is 0–1. |
| `xp` | whole number ≥ 0 | yes | Farming XP when it's cleared. |

## Behaviours

| `behaviour` | What it does |
| --- | --- |
| `{ kind: "eat", reach }` | Eats the crop on its tile, or moves onto one up to `reach` tiles away (diagonals count) and eats it. The crop is gone. |
| `{ kind: "drain", amount }` | Takes `amount` fertility from its tile each Advance; moves to the richest tile next door once the soil is spent. |
| `{ kind: "breed", every }` | The crop it's on doesn't grow. Every `every` Advances, a new one appears on a crop next door. |

With nothing to go for, a pest wanders one tile.
