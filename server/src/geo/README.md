# geo-game backend

geo-game's server, living inside cozy-app's server but never mixed with it.
Everything is under `server/src/geo/` and `shared/src/geo/`; its tables live in
the `geo` Postgres schema of cozy-app's database. cozy-app knows it by three
lines: `apiRouter.use(geoRouter)` in `routes.ts`, and `ensureGeoSchema()` and
`startGeoJobs()` in `index.ts`.

```
server/src/geo/
├── geo.routes.ts        the geo route manifest, mounted once by cozy-app
├── engine/              the combat engine: pure, data-driven, seeded
│   ├── engine.types.ts  effects, triggers, conditions, actions, battle state
│   ├── battle.ts        createBattle / playCard and the event pipeline
│   ├── stats.ts         base + flat, × (1 + Σ percent)
│   ├── rng.ts           seeded RNG, resumable between turns
│   └── battle.test.ts   rules, each checked on its own
├── combat/              loadout → combatants, loot rolls
├── world/               spawns around each player; global effects (the mayor's perks)
├── fishing/             fishing odds with every modifier, and the rod fishing Run's rules
├── dungeons/            dungeon maps: parse hand-drawn layouts, roll a run's map, check every roll
├── data/                ALL game content, a .ts file each: cards, items, enemies, recipes, tuning (see data/README.md)
├── content/             loads data/, checks it, builds CONTENT (schemas in data.schema.ts)
├── modules/             four-file modules, cozy-app style
│   ├── accounts/        geo-game's own accounts (not cozy-app's), refresh tokens, sign-out
│   ├── admin/           game-admin tools, all audited (geo role, not cozy-app's is_admin)
│   ├── vendors/         NPC shops: buy and sell
│   ├── crafting/        crafting a recipe: skills checked, inputs taken, output made
│   ├── market/          listings in escrow, bids, buy-it-now, stacks, collect
│   ├── mayor/           elections on a live timer, one final weighted vote
│   ├── friends/         mutual friends by username, requests, presence heartbeat
│   ├── inbox/           messages (one player's) and announcements (everyone's, one row)
│   ├── feedback/        players send bugs and suggestions; admins triage and reply
│   ├── player/          /geo/me, equipment, hands, saved hands, lunchbox, bait, camp and health, inventory grants
│   ├── wardrobe/        saved loadouts (gear + pet), switching, auto-swap, slot and auto-swap purchases
│   ├── runs/            start (reach-checked), play a card or eat, flee
│   ├── dungeons/        dungeon lobbies: list, create, join, leave, start
│   ├── dungeon-runs/    a started dungeon's map: move room to room, puzzles, leave; room fights are Runs
│   ├── quests/          the quest log: quests given in order, progress counted, turning in; Trials gate enemy tiers
│   ├── fishing/         fishing Runs: open at a spot, cast and fight, leave
│   ├── chests/          chest selections: pending, history, opening one
│   ├── suggestions/     players suggest places; admins review them (admin module)
│   ├── places/          hand-made places: players read them, admins make and edit them
│   ├── world/           /geo/world: spawns near the player
│   └── content/         /geo/content, /geo/health
├── db/                  geo schema, transactions
├── lib/                 geo tokens and secret seeds (own secret and audience)
├── jobs.ts              every 15 s: settle ended auctions, close due elections
├── dev/                 smoke tests, the make-an-admin script, the progress wipe
└── middleware/          geoAuth, geoAdmin, rateLimit
```

## Adding content

All content is TypeScript in `data/`, one file per card, item, enemy,
recipe…, plus tuning numbers in `data/config/`. Each file imports its model
(`import type { Weapon } from "#geo/models"`, i.e. `content/models.ts`) and
ends `satisfies Weapon`, so the editor checks it as you type.
`data/README.md` explains the layout, and each folder's README.md lists its
fields with examples. The loader (`content/data.ts`) checks every file again
against `content/data.schema.ts` (kept equal to the models by the compiler)
and lists every problem with its file. `npm run geo:data` checks the data
without the server; `npm run dev` restarts when a data file changes.

Combat rules are data too, built from effects (`data/EFFECTS.md`):

- **trigger**: which event, and the owner's part in it (`attacked` as
  `target` = "when you're attacked");
- **conditions**: e.g. the target `hasStatus` burning, the card `cardHasTag` fire;
- **chance**: 0–1;
- **actions**: attack, damage, heal, guard, barrier, applyStatus, removeStatus,
  cancelAction, freeCharge, modifyDamage.

The content index checks ids at boot, so a typo fails on start, not mid-fight.
If a new rule needs a trigger, condition or action that doesn't exist, add it
in `engine.types.ts` and handle it in `battle.ts`, with a test.

## Skill levels

Levels come from XP by one shared curve (`shared/src/geo/skills.ts`), and
every skill stops at level 50; XP still counts past it. Combat level adds
1% damage dealt per level (`damageDealt`, read for every hit the player
deals, any element, procs included, never damage to oneself).

Status damage (a Burning tick) never gets `damageDealt` or any other general
buff. It changes only through a rule that asks for it: the
`damageFromStatus` condition on a `beforeDamage` effect, e.g. an Oiled
status that makes burns hit 1.5×.

## Food and the lunchbox

Food is a `consumable` item with `food` rules (`data/food/`): tags, and
actions done to the eater, e.g. a heal plus `applyStatus` Well Fed. A new dish
is an entry there; a new kind of effect is a status, built like any other.
Eating fires `foodEaten`, so gear can react to it (`foodHasTag`). Mending
never boosts the food's own heals.

Players pack food into lunchbox slots before a Run (1 slot to start, up to 4;
a stack of one food per slot, no food in two slots). Packing moves it out of
`geo.inventory` into `geo.lunchbox`, and unpacking moves it back, so packed
food can't be sold, listed or crafted. In a Run, `POST …/turns` with
`{ lunchboxSlot }` eats one, which takes the turn. The lunchbox can't be
repacked mid-Run.

Bait works the same way for fishing: a `consumable` with `bait` rules
(PLACEHOLDER `scent`), packed into bait slots (`geo.bait`, 1 slot to start,
up to 4) through `PUT/DELETE /geo/me/bait/:slot`. Bait used to be cards;
the old card rows went with a progress wipe (`wipe:geo`). Each cast takes one
from the first packed slot (a mayor's Bait Lover may save it). Bait is
optional: with none packed, a cast is a bare hook that only hooks commons,
never a sea creature, and never lands a quality catch.

## Health, camp and restocking

Risk comes from not being able to top up away from camp. Health carries
between fights (`geo.players.health`, NULL = full, clamped to max health from
gear whenever it's read): a combat Run starts from it and saves it every turn,
so closing the app mid-fight, or fleeing, keeps the damage. Fleeing costs
nothing else. A defeat (or any death) leaves a tenth of max
(`GEO_DEFEAT_HEALTH_FRACTION`) and every coin is lost. Health never
regenerates over time, and there is no resting. Only food from the packed
lunchbox refills it: as a turn in a fight, or between fights anywhere with
`POST /geo/me/lunchbox/:slot/eat`. Between fights the food resolves in the
battle engine (`eatBetweenFights`) but only its effect on health is kept:
heals and harm, which stops at 1 HP; buffs and statuses
only work in a fight. The lunchbox is the only food
a player has while away, because repacking needs camp.

Dungeon Runs are the exception: fought at full health, and the player's own
health is as it was afterwards, win or lose (`geo.runs.keeps_health`).

Camp is set with `PUT /geo/me/camp { position }`, at most once every
`GEO_CAMP_MOVE_DAYS` (2), never expires (it stays until a new one is set), and stored rounded to 4 decimals (about 11 m), never
the exact point given. It's personal location data: only the player sees it
(never other players, admin pages or logs), and it goes with the account. `DELETE` forgets it but
keeps when it was set, so the move limit still counts. Packing the lunchbox or bait
needs `position` within `GEO_CAMP_RADIUS_METRES` of camp; unpacking works
anywhere. Rules: `modules/player/geo-camp.rules.ts`.

The bank is at camp: `POST /geo/me/bank/deposit` and `/withdraw`
`{ amount, position }` move coins between `coins` (the purse) and
`bank_coins`. Both need `position` at camp and refuse mid-Run, since a
defeat empties the purse and banking mid-fight would dodge it. Death never
touches `bank_coins`. `npm run smoke:geo-bank`.

## Wardrobe

Saved loadouts of worn gear and a pet, after SkyBlock's wardrobe
(`modules/wardrobe`, `geo.loadouts`). A loadout points at inventory ids
rather than holding items, so a piece can be in several; whatever has left
the inventory is skipped when it's worn and left out when it's read. The
loadout last worn or saved is active (`players.active_loadout`), and every
equip and pet change saves into it. Wearing is refused mid-Run.

Rods are held in the main hand, so fishing means wearing a fishing loadout.
Auto-swap wears the loadout tagged for `combat` or `fishing` as that starts,
inside the Run's own transaction and before the gear is read:
`openCombatRun` (spawns, dungeons, sea creatures), `startFishing` and each
fishing step. Skills (`GEO_FREE_AUTO_ACTIVITIES`) swap for free, falling
back to the first loadout with a rod when none is tagged; combat needs
auto-swap bought once (`config/wardrobe.ts`). `autoSwap` takes a
`LoadoutTrigger` (activity, plus enemy and dungeon for fights) and
`pickAutoLoadout` is the one place that chooses, where player-set rules
("entering this dungeon, wear X") would go. Extra slots are bought too. New
players get the starter kit's loadouts (Combat, Fishing), already tagged.
`npm run smoke:geo-wardrobe`.

## Fishing Runs

A fishing Run (`modules/fishing`, rules in `fishing/fishing-run.ts`) is a
session at one spot: it shares `geo.runs` with combat (`kind = 'fishing'`),
so the fishing hand is locked while it's open, and only one Run of either
kind is open at a time (starting a fight leaves the spot). Each step is a
`POST /geo/fishing/:runId/actions`: cast, wait, strike, cut the line, fight
a sea creature, or play a card. Every hooked fish is fought: there's no quick land. A landed fish goes straight into the
inventory with its fishing XP, in the same transaction as the step.

A regular catch is a tradable `fish.<id>` material; a quality catch is a
Soulbound `fish.<id>.<tier>` item (made from each `data/fish/` file), which vendors and
the Market refuse. The water's tier is the app's word (the server has no map
tiles), like the player's position. PLACEHOLDER: fish, cards, tier
thresholds and the rod are first drafts; card rules are a switch on card id
until the fishing engine additions make them data. `npm run smoke:geo-fishing`
checks the whole loop.

## Dungeon runs

Starting a lobby for a dungeon with layouts rolls each member a map on the
server (`dungeons/dungeon-map.ts`) and saves it whole on a
`geo.dungeon_runs` row, so editing a layout never touches a run in
progress. The app only asks to do things (enter a room, answer a puzzle,
leave) and gets back the rooms it may see: fogged rooms and puzzle answers
never leave the server (`dungeons/dungeon-run.ts`). Every rule is checked
on each request: a door from somewhere you've been, nothing blocking the way,
the boss sealed until every star room is cleared, a key in the inventory
for a locked room (one is used up).

A room fight is an ordinary combat Run (`dungeon_run_id`, `dungeon_room`),
started at the dungeon's carried health and played with the Run endpoints.
When it ends, `dungeonFightOver` tells the map: a win marks the room done
(the boss's ends the dungeon, scores it and puts its chests in the Chests
tab), a defeat fails the dungeon, a flee goes back a room with the damage
kept. Room fights drop their enemies' usual loot, coins and XP (so a
dungeon-only enemy can drop gear); a dungeon death never costs coins.
Eating from the lunchbox between rooms heals the dungeon's health. While a
dungeon is active, spawn fights and fishing are refused.
`npm run smoke:geo-dungeons` walks one end to end.

## Crafting

A recipe (`data/recipes/`) uses up its inputs and makes its output, per
craft, and may need skill levels (never spent). Recipes go to the app with
the content, which is how it shows an item's uses. Inputs come only from
rows that are free: nothing worn, bagged or in a hand, and cards only at full
charge.

Compact materials (`compact` in a `data/materials/` file) press `ratio`
of a material into one "Compact" item, so a recipe can want 50,000 of
something without the player carrying a 50,000 stack. That one field makes
the compact item and its recipe; it's one-way, and worth what it holds.

## Money and items

Every coin movement writes a `coin_ledger` row, so a player's coins always
equal the sum of their ledger, bank moves included as `bank-deposit` and
`bank-withdraw` (`GET /geo/admin/economy` lists any that
don't). Trades follow one order, in one transaction: coins are taken
(`spendCoins`, which refuses rather than going below 0) before anything is
handed over, and an item leaves its owner (`takeFromInventory`, row locked,
refused while worn, bagged or in a hand) before a listing or sale exists.

## Chests

An enemy with `chests` (`data/enemies/`) has a `chance` that a win gives
a chest selection in place of its loot list; coins and XP come as usual. Each
offer in it is a tier (`data/config/chest-tiers.json`: name and cost to open) with its
own chance to be in the selection, and its own loot: pools of weighted
entries, each pool rolled `rolls` times. At least one offer has chance 1 and
every chest gives at least one item; the content index refuses anything else
at boot.

Every chest is rolled at the win and saved in `geo.chest_selections`, so
nothing rerolls. The player opens one (`POST /geo/chests/:id/open`): its cost
is spent, its items granted, and the rest are gone, their contents never
sent to the app. Until then the selection is pending, through deaths too
(`GET /geo/chests`). `assertCanOpenChests` is where a full overflow will
refuse, once the inventory has a size.

## Global effects

A mayor's perks are `StatModifier`s on any stat id. `world/global-effects.ts`
gives the mayor in office; a rule reads its stat with
`applyModifiers(base, await playerModifiers(playerId), "eelChance")`, which
includes the player's own gear and talismans too. Combat stats reach every
fight; `coinDrops`, `vendorPrices` and `voteWeight` are read by their rules.

## Hand-made places

Map places mostly come from the map tiles, on the phone. `geo.places` holds
the ones an admin makes by hand (a skill hub or a landmark), which the app
draws with the same markers and the same 40 m reach
(`GEO_PLACE_REACH_METRES`). Players get the active ones within 2 km from
`GET /geo/places`, a separate call from `/geo/world` because places barely
change while spawns change every minute. Admins list, make, edit, move,
hide (`active: false`) and delete them under `/geo/admin/places`, every
change audited. Making one with a `suggestionId` links that suggestion and
accepts it; a suggestion makes at most one place. That is the only way to
accept one: agreeing with a suggestion means placing it, so `PUT` refuses
`accepted` and only rejects or reopens.

An admin can correct a suggestion before deciding (`PATCH
/geo/admin/suggestions/:id`): move its pin or change its kind. The first
move keeps the player's own pin in `original_latitude`/`original_longitude`;
the note stays the player's, and every change is audited.

## Dev servers

On any server that isn't production, `POST /geo/runs` also takes `enemyId`,
to fight anywhere. Production doesn't. Every server gives a new player the
same starter kit (`modules/accounts/geo-starter-kit.ts`).

The app copies `shared/src/geo/` with `npm run sync:contracts` in the
geo-game repo; run it after changing a contract.

## Commands

From `server/`:

| Command | Does |
| --- | --- |
| `npm run test:geo` | engine, content and spawn tests (no database needed) |
| `npm run wipe:geo -- --yes` | resets every player's progress to the starter kit, keeping accounts (local only; no `--yes` = dry run) |
| `npm run smoke:geo` | the whole API against the local database: sign-up to a won fight |
| `npm run smoke:geo-economy` | vendors, the Market and elections against the local database |
| `npm run smoke:geo-suggestions` | location suggestions: sending, admin review and corrections, audit |
| `npm run smoke:geo-places` | hand-made places: admin make, edit, hide, remove; players' nearby list; from a suggestion |
| `npm run geo:admin -- <email>` | makes that account a game admin (`--revoke` to undo) |
| `npm run geo:sell-values` | which items still have a placeholder NPC sell value |
| `npm run dev` | cozy-app's server, geo routes included |
