# Mutations

Secret fantasy crops. A mutation can't be planted: it sprouts on an empty
farm tile when its `recipe` holds there on a turn (checked after growth),
rolling `chance`. Then it grows and harvests like a crop, with no seeds back.

Players find recipes only by experimenting. The first of each mutation
turned in at the Research Lab records the recipe in the journal and pays
`research`; after that its crop just sells.

Its `produce` is an ordinary `farming` material in `materials/farming/`.

## Fields

Model: `Mutation` in `#geo/models` (`content/models.ts`).

| Field | Type | Required? | What it does |
| --- | --- | --- | --- |
| `id` | text | yes | Matches the file name; not shared with a crop. |
| `name`, `icon`, `description` | text | yes | Shown in the app once it sprouts. |
| `produce` | item id | yes | The farming material a harvest gives. |
| `stages`, `yield`, `fertilityCost`, `xp` | | yes | As for crops. |
| `recipe.parents` | `{ cropId, count }[]` | yes | Ripe crops among the 8 tiles around the empty one: at least `count` of each. |
| `recipe.weather` | weather | no | The weather of that turn. |
| `recipe.event` | farm event id | no | A farm event on that turn, e.g. `blood-moon`. |
| `recipe.pest` | pest id | no | A pest of this kind on the tile or one of the 8 around. |
| `recipe.minFertility` | 0–10 | no | The empty tile's fertility, at least. |
| `recipe.structure` | structure id | no | That structure on one of the 8 tiles around, e.g. `lightning-rod`. |
| `recipe.soil` | soil | no | The empty tile's soil (a card's overlay counts), e.g. `cursed`. |
| `chance` | 0–1 | yes | Chance it sprouts on a turn where the recipe holds. Hand Pollinate multiplies it (`config/farming.ts` `pollinateBoost`). |
| `research` | `{ coins, xp }` | yes | Paid once, for the first turned in at the Research Lab. |

Keep recipes findable by accident: players get no hints.
