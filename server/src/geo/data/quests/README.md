# Quests

Things for a player to do, and what turning them in pays. The server counts
progress (a kill in a won fight) and writes each objective's label for the app
from it: `Kill Green Slime (0/1)`.

Not live yet: quests are defined and checked here, but taking them, counting
progress and turning them in come next.

## Fields

Model: `Quest` in `#geo/models` (`content/models.ts`). Hover any field in the editor for the same help.

| Field | Type | Required? | What it does |
| --- | --- | --- | --- |
| `id` | text | yes | Must match the file name. |
| `title` | text | yes | Shown in the quest log and tracker. |
| `giver` | text | no | Who gives it, as the app shows it: "The Angler". |
| `objectives` | list | yes | All must be met before it can be turned in. See below. |
| `rewards.coins` | whole number | no | Coins paid on turn-in. |
| `rewards.items` | list of `{ itemId, quantity }` | no | Items paid on turn-in. A quest needs coins, items or both. |

### Objectives

Each has an `id` unique within the quest, and a `type`:

| `type` | Fields | Counts |
| --- | --- | --- |
| `kill` | `enemy` (enemy id), `count` | Each of that enemy defeated in a won fight. |

## Example

```ts
import type { Quest } from "#geo/models";

export default {
    id: "slime-cull",
    title: "Slime Cull",
    objectives: [{ id: "kill", type: "kill", enemy: "green-slime", count: 1 }],
    rewards: { coins: 5 },
} satisfies Quest;
```
