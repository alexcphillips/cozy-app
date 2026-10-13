# Structures

Farm structures. Each file makes an item, `structure.<id>`, kept in the misc
tab. A recipe in `recipes/` crafts it; at a farming place it's placed on one
empty tile, and picked back up whole (a Pest Cage must be empty first).

What each kind does is in the rules (`farming/farm.ts`); a file only tunes
its numbers.

## Fields

Model: `Structure` in `#geo/models` (`content/models.ts`), plus the
[fields every item has](../README.md#fields-every-item-has).

| `effect` | What it does |
| --- | --- |
| `{ kind: "jukebox", boost }` | Its tune (picked on the tile, free) makes that pest `boost` times likelier to be the one that spawns. Spawn odds overall don't change. |
| `{ kind: "cage" }` | Holds one pest alive (the Cage action, 2 Labor, from a tile on or next to it). A caged pest doesn't act, and counts as that pest nearby for mutation recipes. Release it to clear it for its drops. |
| `{ kind: "beehive", boost, swarmChance }` | Mutation chances × `boost` on empty tiles around it. Each turn, `swarmChance` the bees swarm and the crops around don't grow. |
| `{ kind: "compost", capacity }` | Each harvest and clear on the farm adds 1 compost, up to `capacity`. Each turn spends 1 for +1 fertility on the 8 tiles around. |
| `{ kind: "pond" }` | Keeps the 4 tiles beside it at 1 water or more, and its frog eats 1 pest on or around it each turn (no drops). |
| `{ kind: "greenhouse" }` | Shelters the 8 tiles around: they get no weather (they grow as on a clear day, safe from storms and frost), no pests arrive there (they can still walk in), and no mutations sprout there. |
| `{ kind: "reactor", radius, growth, wasteChance }` | Crops within `radius` tiles grow `growth` extra stages a turn (when they grow at all). Each turn, `wasteChance` nuclear waste lands on a tile within `radius`, killing what grows there (see `config/farming.ts` `waste`). |
| `{ kind: "portal", wave, pests }` | Does nothing until a Tear the Veil card opens it. On the next turn, `wave` pests picked from `pests` come through around it, then it shuts. |
| `{ kind: "shrine" }` | Takes offerings from the inventory (on its tile, free). Their NPC value buys a roll for a blessing; see `config/farming.ts` `shrine`. |
| `{ kind: "well", capacity, rain, storm, heatwave }` | Stores up to `capacity` water: a Rain turn adds `rain`, a Storm `storm`, a Heatwave takes `heatwave`. While it has water, plain Water draws 1 from it and costs no Labor. Starts empty. |
| `{ kind: "lightning-rod", radius }` | Storms can't flatten crops within `radius` tiles. Mutation recipes can need one nearby (`recipe.structure`). |
