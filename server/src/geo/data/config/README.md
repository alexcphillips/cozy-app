# Config

Tuning numbers that aren't a list of things. Each file is required, and
there's no `id`. Hover a field in VS Code for what it does.

## player.ts

| Field | What it does |
| --- | --- |
| `baseStats` | A player's stats before gear and talismans: `maxHealth`, `attack`, `defence`, `speed`, `critChance`, `critMultiplier`. |

Skill levels (max 50, the XP curve, +1% damage per combat level) are in
`shared/src/geo/skills.ts`, not here, because the app uses them too.

## starter-kit.ts

What a new account gets.

| Field | What it does |
| --- | --- |
| `items` | `{ itemId, quantity }` granted. Cards are `card.<id>`. |
| `equip` | `{ slot: itemId }` equipped on arrival. The item must be in `items`. |
| `handSkills` | Every starter card of these skills becomes that skill's first hand. |
| `lunchbox` | Food packed into the lunchbox, slot by slot. |
| `bait` | Bait packed into the bait slots, slot by slot. |
| `seeds` | Seeds packed into the Seed Bag, slot by slot. No more than `farming.ts` `seedBagSlots`. |

Changes apply to new accounts. To re-grant to everyone, run
`npm run wipe:geo -- --yes`.

## spawns.ts

Enemy spawns around each player.

| Field | What it does |
| --- | --- |
| `reachMetres` | How far away a fight can start. New spawns land within it. |
| `minSpawnMetres` | New spawns land at least this far away. |
| `outOfReachSeconds` | How long a spawn lingers once you walk out of reach. |
| `respawnAfterWinSeconds` | A beaten spawn holds its slot this long. |
| `countWeights` | Weights for having 1, 2, 3… spawns at once. The list's length is the cap. |
| `windowMinutes` | How long one roll of `countWeights` holds. |
| `spawnGapSeconds` | At most one new spawn this often. |
| `lifetimeMinutes` | `{ min, max }` a spawn lasts. |
| `enemies` | `{ enemyId, weight }`: which enemies spawn, how often. An enemy not listed never spawns on its own. |

## fishing.ts

| Field | What it does |
| --- | --- |
| `baseOdds` | `eelChance`, `baitSaveChance`, `seaCreatureChance` (0–1) before gear and mayor perks. |
| `rarityWeight` | How often each rarity bites, when the water allows it. |
| `waterRarities` | Which rarities can bite in `puddle`, `pond`, `lake`, `open` water. |
| `rarityDifficulty` | Quality thresholds × this: rarer fish need more Finesse. |
| `parTurns` | Turns a clean fight should take, per rarity. Past par, each turn costs 1 Finesse. |
| `tuning.zoneLow`, `zoneHigh` | The sweet Tension zone, as a share of the line's cap. |
| `tuning.tierThresholds` | Finesse needed for bronze, silver, gold, ruby. |
| `tuning.maxTurns` | A fight this long is lost. |
| `defaultRod` | `name`, `power`, `line`, `maxTier`: everyone's rod until rods are gear. |

## farming.ts

| Field | What it does |
| --- | --- |
| `laborPerTurn` | Labor each Farm Turn gives. |
| `turnHours`, `maxTurnsBanked` | A Farm Turn comes in this often, and this many can wait unspent. |
| `startTurnsBanked`, `startSize` | A new farm's banked turns, and the odd-sized square it owns in the middle of the 9×9. |
| `unlockCost` | `{ first, step }`: coins for the nth extra tile are first + step × (n − 1). |
| `seedBagSlots` | Seed Bag slots a new player has (most: 4). |
| `startFertility`, `fallowRecovery`, `fallowCap` | Every tile's fertility to start; an empty tile gains `fallowRecovery` per Advance up to `fallowCap`. |
| `fertilityYield` | `{ low, high }`: harvest −1 at or below `low` fertility, +1 at or above `high`. |
| `rotChances` | Harvest or push: rot chance on each Advance a ripe crop waits. Each wait it survives adds +1 yield; the list's length caps that. |
| `labor` | Labor for the plain actions: `water`, `harvest`, `clear`, `swat` (clears the pests on a tile), `cage` (a pest into a Pest Cage). |
| `pests` | `fromTurn`: no pests before this Advance. Then each Advance one spawns with chance `chancePerCrop` × liked crops growing, at most `maxChance`, while fewer than `max` are on the farm. |
| `pollinateBoost` | Hand Pollinate multiplies a tile's mutation chances by this on the next Advance. |
| `weatherWeights` | Placeholder weather, rolled when a farm has no home region or the weather service is down: how often each of `clear`, `overcast`, `rain`, `heatwave`, `storm`, `frost` comes. |
| `weather` | Real weather (Open-Meteo, per home region). A turn's 12 hours are a `storm` with any thunderstorm hour, else `frost` at or below `frostC` °C, else `heatwave` at or above `heatwaveC` °C, else `rain` with `rainMm` mm or more, else `overcast` with mean cloud `overcastCloud` % or more, else `clear`. `regionDegrees`: the home region's grid square. `homeCooldownDays`: how often it can move. `stormFlattenChance`: each open-field crop flattened in a storm. `frostKillsUpToStage`: growing open-field crops at this stage or below die in a frost. |

## elections.ts

| Field | What it does |
| --- | --- |
| `firstMayor` | In office before any election has finished. |
| `candidates` | Mayors standing in each election. |
| `minHours` | An election ends at the first Monday 00:00 UTC at least this far away. |

## economy.ts

| Field | What it does |
| --- | --- |
| `placeholderSellValue` | NPC sell value, per rarity, for items without their own `sellValue`. |

## weapons.ts

| Field | What it does |
| --- | --- |
| `types` | Weapon types (`dagger`, `sword`…). A weapon's `weapon.type` and a card's `requiresWeapon` must use these. Add a type here first. |
| `styles` | How weapons fight (`melee`…). Same rules. |

## chest-tiers.ts

| Field | What it does |
| --- | --- |
| `tiers` | `{ id, name, cost }` for `plain`, `gold`, `ruby`, `void`: shown name and coins to open (0 = free). The four ids are fixed in code. |
