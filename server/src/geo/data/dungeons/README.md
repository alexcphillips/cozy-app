# Dungeons

Raid-style boss fights. Any POI opens the dungeon menu: one worldwide list of
lobbies. A player at a POI creates a lobby for a dungeon, others join, and when
the countdown ends (or the host starts early) everyone in it enters.

For now each player who enters fights the boss in their own solo Run, with the
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
| `minCombatLevel` | 1–50 | yes | The lowest combat level a lobby can ask for. The host can ask for more, up to their own level. |
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
    minCombatLevel: 1,
    maxPlayers: 4,
} satisfies Dungeon;
```

Lobby timings (countdown, time to enter) are `GEO_DUNGEON_LOBBY_SECONDS` and
`GEO_DUNGEON_ENTER_SECONDS` in `shared/src/geo/dungeon.contract.ts`.
