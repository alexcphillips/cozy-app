# Dungeons

Raid-style boss fights. Any POI opens the dungeon menu: one worldwide list of
lobbies. A player at a POI creates a lobby for a dungeon, others join, and when
the host starts it everyone in it goes in at once. There's no countdown.

For now each player fights the boss in their own solo Run, with the
boss's usual loot, coins and XP. Shared multiplayer Runs, and scaling the boss
to the party's size, come later.

A dungeon is only offered once the app has its boss's sprite, as with spawns.

## Fields

Model: `Dungeon` in `#geo/models` (`content/models.ts`). Hover any field in the editor for the same help.

| Field | Type | Required? | What it does |
| --- | --- | --- | --- |
| `id`, `name` | text | yes | |
| `description` | text | yes | One or two sentences for the lobby menu. |
| `boss` | enemy id | yes | The enemy fought: its stats, moves, loot and sprite. |
| `bossModifiers` | list of [modifiers](../EFFECTS.md#modifiers) | no | Makes the boss bigger than it is on the map. `percent` 2 = triple. |
| `requiredLevel` | 0–50 | yes | The combat level needed to make or join a lobby for it. 0 = none. A host can ask more of their lobby, up to their own level. |
| `maxPlayers` | 1–8 | yes | Lobby size, host included. |

## Example

```ts
import type { Dungeon } from "#geo/models";

export default {
    id: "slime-pits",
    name: "Slime Pits",
    description: "Something huge and acidic has settled at the bottom of the pits.",
    boss: "acid-slime",
    bossModifiers: [{ stat: "maxHealth", kind: "percent", value: 2 }],
    requiredLevel: 0,
    maxPlayers: 4,
} satisfies Dungeon;
```

How long a host can be away before their unstarted lobby closes is
`GEO_DUNGEON_HOST_AWAY_SECONDS` in `shared/src/geo/dungeon.contract.ts`.
