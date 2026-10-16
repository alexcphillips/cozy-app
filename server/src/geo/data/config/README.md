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
| `tierUnlockLevels` | The combat level that opens each enemy tier: `[1, 5, 12…]` is tier 1 from level 1, tier 2 from 5, tier 3 from 12. Must start at 1 and go up. An enemy whose [`tier`](../enemies/README.md#fields) the player hasn't opened never spawns for them. |
| `lowerTierWeights` | How common enemies of tiers below the player's are, against their own tier's (1): one tier below, two below… The last carries on for any lower. Above 0, so old materials still turn up. |
| `enemies` | `{ enemyId, weight }`: which enemies spawn anywhere, how often. Enemies with no `habitats` spawn only from here. |
| `habitats` | Per kind of place (`water`, `mining`, `foraging`, `farming`, `landmark`): `{ influenceMetres, weight }`. Each new spawn picks where it's from by weight: `enemies` has 1, and each kind of place nearby has its `weight` when the player is on it, fading to nothing at `influenceMetres` (at most 250). Who lives there is each enemy's [`habitats`](../enemies/README.md#habitats). A place within reach gets its spawns beside it; farther, they land on the player's side facing it. Keep `water` within `reachMetres`, so water creatures land on the shore. |

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
| `seaCreatures` | Per water, the [enemies](../enemies/README.md) a sea creature can be: `{ enemyId, weight }`. Fighting one starts a combat Run. Empty: no sea creatures there. |

## farming.ts

| Field | What it does |
| --- | --- |
| `laborPerTurn` | Labor each turn refills to, at farming level 1. |
| `laborLevels` | Farming levels that each add 1 Labor per turn, lowest first (e.g. `[10, 20, 35, 50]`: 3 Labor up to 7). |
| `turnHours` | The farm takes a turn on its own this often: crops grow, weather lands, pests move, Labor refills. |
| `maxTurnsAway` | Turns the farm takes while the player is away; past this it waits for them (nothing grows, nothing is lost). |
| `startSize` | The odd-sized square a new farm owns in the middle of the 9×9. |
| `unlockCost` | `{ first, step }`: coins for the nth extra tile are first + step × (n − 1). |
| `startFertility`, `fallowRecovery`, `fallowCap` | Every tile's fertility to start; an empty tile gains `fallowRecovery` per turn up to `fallowCap`. |
| `fertilityYield` | `{ low, high }`: harvest −1 at or below `low` fertility, +1 at or above `high`. |
| `rotChances` | Harvest or push: rot chance on each turn a ripe crop waits. Each wait it survives adds +1 yield; the list's length caps that. |
| `labor` | Labor for the plain actions: `water`, `harvest`, `clear`, `swat` (clears the pests on a tile), `cage` (a pest into a Pest Cage). |
| `pests` | `fromTurn`: no pests before this turn. Then each turn one spawns with chance `chancePerCrop` × liked crops growing, at most `maxChance`, while fewer than `max` are on the farm. |
| `events` | `fromTurn`: no farm events before this turn. Then each turn telegraphs one for the next with this `chance` (which one: their `weight`s in `farm-events/`). |
| `orders` | The weekly Order Board: `perWeek` orders for plain crops, each asking for `value` (`{ min, max }`) coins of NPC sell value. Completing pays that × `rewardMultiplier` plus the deposit back; accepting costs `depositShare` of the reward, lost if the week ends first. |
| `contests` | Weekly farm contests (Total Harvest, Top Mutation, a rotating crop). `prizes`: coins for 1st, 2nd, 3rd…; `participation`: for every other entrant. Paid each Monday 00:00 UTC. |
| `pesthunter` | The Pesthunter button on the farm. A caged pest turned in pays its `bounty` (in the pest's file) in points, and no drops. `shop`: `{ itemId, price }` items those points buy. |
| `globalEvents` | Server-wide events: one `{ eventId, days, weight }` picked each week by `weight`, announced Monday, running the week's last `days` days (UTC). Every farm's turns during it get the event. |
| `waste` | Nuclear waste from a Reactor. Each turn a waste tile spreads to one beside it with `spreadChance` (killing what grows there); empty tiles next to waste get mutation chances × `mutationBoost`; each waste tile has `pestChance` of a `pest` crawling out. `labor.scrub` clears one by hand. |
| `soil` | Soil types. `rich` rests to `richFallowCap` fertility at `richRecovery` a turn; `boggy` never dries below 1 water; plain crops on `cursed` yield `cursedYield` (negative). `amendments`: `{ itemId, soil }`, items that change a tile's soil for good. A Pond turns up `peatItem` `peatChance` a turn; the Shrine leaves `ashItem` when it doesn't bless. Rocky and Ancient soils wait for mining and archaeology. |
| `shrine` | The Mysterious Shrine. An offering worth `value` coins (NPC sell value) grants a blessing with chance value ÷ (value + `halfValue`), so more is better but never certain. A failed roll is a curse `curseShare` of the time. `blessings`: `{ id, name, description, turns, weight, curse }`; ids are `growth`, `plenty`, `mutation` and (a curse) `pests`. |
| `pollinateBoost` | Hand Pollinate multiplies a tile's mutation chances by this on the next turn. |
| `weatherWeights` | How often each weather is rolled for a farm turn (seeded per farm): `clear`, `overcast`, `rain`, `heatwave`, `storm`, `frost` comes. |
| `weather` | What the harsh weathers do. `stormFlattenChance`: each open-field crop flattened in a storm. `frostKillsUpToStage`: growing open-field crops at this stage or below die in a frost. |

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
| `unarmed` | `{ type, style, modifiers }`: what the player fights with when no weapon is equipped (fists, +1 attack). Its type and style must be in the lists above. |

## chest-tiers.ts

| Field | What it does |
| --- | --- |
| `tiers` | `{ id, name, cost }` for `plain`, `gold`, `ruby`, `void`: shown name and coins to open (0 = free). The four ids are fixed in code. |

## pets.ts

Pets, after Hypixel SkyBlock's (see [pets](../pets/README.md)). PLACEHOLDER numbers.

| Field | What it does |
| --- | --- |
| `maxLevel` | Pets stop levelling here. |
| `xpCurve` | `{ base, rarityMultiplier }`: XP from level L to L + 1 is base × L × the rarity's multiplier. |
| `otherSkillShare` | Share of other skills' XP the active pet gains (Hypixel: a third). |
| `skillMultiplier` | Extra pet XP from a skill, e.g. `{ fishing: 1.5 }`. |
| `upgrades` | Kat's price to raise a pet from each rarity, `{ coins, items?, hours }`, for pets without their own. |
| `upgradeDiscountPerLevel` | Taken off Kat's coins and hours per pet level. |
| `heldItemRemovalCost` | Coins to take a held item off a pet, by the held item's rarity. |

