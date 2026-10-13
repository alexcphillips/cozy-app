import type { GeoChestTier, GeoFarmWeather, GeoFishingTier, GeoQualityTier } from "@cozy/shared/geo";
import type { Action, Amount, Condition, EffectDef, StatModifier } from "../engine/engine.types";

/**
 * The models for every file in `geo/data/`. A data file imports its model
 * and checks itself against it:
 *
 *     import type { Weapon } from "#geo/models";
 *
 *     export default {
 *         id: "broadsword",
 *         …
 *     } satisfies Weapon;
 *
 * so the editor autocompletes every field, explains it on hover, and
 * underlines a mistake as you type. `npm run typecheck` checks them all.
 * The server checks every file again when it loads it (`data.schema.ts`,
 * kept in step with these types by the compiler), plus the references
 * between files.
 */

export type { Action, Amount, Condition, StatModifier };
/** A passive rule: when `trigger`, if `conditions`, `chance` of the time, do `actions`. See data/EFFECTS.md. */
export type Effect = EffectDef;

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** A display row on the item page, e.g. `{ label: "Speed", value: "Slow" }`. Words only: no rule reads it. */
export type ItemStat = { label: string; value: string };

/** So many of one item. */
export type ItemAmount = { itemId: string; quantity: number };

/** Inclusive. */
export type Range = { min: number; max: number };

// ---------------------------------------------------------------------------
// Items

/** Fields every item has. */
export type ItemBase = {
    /** Unique across all items. Lower-case letters, digits, dots and dashes. Must match the file name. */
    id: string;
    /** Shown in the app. */
    name: string;
    rarity: Rarity;
    /** A Game Icons name (game-icons.net), e.g. "broadsword". */
    icon: string;
    /** Flavour text. */
    description: string;
    /** Extra rows on the item page. Words only: nothing reads them. Stat modifiers get rows by themselves. */
    stats?: ItemStat[];
    /** Passive effects as the app lists them. Words only. */
    effectText?: string[];
    /**
     * Coins an NPC pays for one. Also the lowest Market price and the base of
     * Market fees. Unset = the rarity placeholder in config/economy.
     */
    sellValue?: number;
};

/** Stats and rules while worn (or, for talismans, while in the bag). */
export type GearRules = {
    /** Stat changes: (base + flat) × (1 + percent). */
    modifiers?: StatModifier[];
    /** Procs and passives. */
    effects?: Effect[];
};

export type EquipmentRules = GearRules & {
    /** Card ids (no `card.`) only usable while this is equipped. */
    unlocksCards?: string[];
};

/**
 * A card: its rules and the item players own, in one file. The item's id is
 * `card.<id>`.
 */
export type Card = ItemBase & {
    /** Which hand it goes in: combat, fishing, mining, farming, foraging… */
    skill: string;
    /** Plays before it fades. */
    maxCharges: number;
    /** Who the player aims it at. */
    targets: "enemy" | "self";
    /** What playing it does, in order. Default none. Fishing cards' rules are in code. */
    actions?: Action[];
    /** Card-only rules, heard only when this card is played (e.g. free against Burning). */
    effects?: Effect[];
    /** e.g. "fire", for cardHasTag conditions on gear and statuses. */
    tags?: string[];
    /**
     * Weapon types or styles (config/weapons); the wielded weapon must carry
     * one, e.g. ["dagger"] or ["melee"]. Omit = playable with anything.
     */
    requiresWeapon?: string[];
    /** Fishing cards only: whether it raises or lowers catch quality. */
    finesse?: "raises" | "lowers";
};

/** A main-hand weapon. */
export type Weapon = ItemBase &
    EquipmentRules & {
        weapon: {
            /** From config/weapons types, e.g. "dagger". */
            type: string;
            /** From config/weapons styles, e.g. "melee". */
            style: string;
        };
    };

/** Shields (offHand), helmets, chest pieces, gloves, leg armour. */
export type Armour = ItemBase &
    EquipmentRules & {
        slot: "offHand" | "head" | "chest" | "hands" | "legs";
    };

export type Ring = ItemBase & EquipmentRules;

/** Counts only while in the Talisman Bag, one copy each. */
export type Talisman = ItemBase & GearRules;

/** Gathered or looted, crafted with. Crops are farming materials. */
export type Material = ItemBase & {
    /** Its inventory sub-tab, and which vendors buy it. */
    skill: string;
    /** Default 999. */
    stackSize?: number;
    /**
     * Also makes a Compact version, `compact-<id>`, and the recipe pressing
     * `ratio` of this into one. One-way; worth exactly ratio × this.
     */
    compact?: { ratio: number };
};

/** Packed in the lunchbox; eating it in a Run uses the turn. */
export type Food = ItemBase & {
    /** Default 99. A lunchbox slot holds up to 10. */
    stackSize?: number;
    /** Heals the eater this much (raised by foodHealing), and adds a Heals row. */
    heal?: number;
    /** e.g. "spicy", for foodHasTag conditions. */
    tags?: string[];
    /** Done to the eater (`self`) after the heal, e.g. applyStatus "well-fed". */
    actions?: Action[];
    /** Food-only rules, heard only as this food is eaten. */
    effects?: Effect[];
};

/** Packed in the bait slots; one per cast. */
export type Bait = ItemBase & {
    /** Default 99. */
    stackSize?: number;
    /** PLACEHOLDER: shown, but no rule reads it yet. */
    scent: number;
    /** Draws sea creatures and makes the bite come sooner. */
    chum?: boolean;
};

/** Keys, nets, lenses: anything else. */
export type MiscItem = ItemBase & {
    /** Which inventory tab. Default "misc"; "consumable" for potions that aren't food. */
    kind?: "misc" | "consumable";
    /** Default 99. */
    stackSize?: number;
};

// ---------------------------------------------------------------------------
// Everything else

export type FishIntent = "run" | "thrash" | "dive" | "rest" | "jump";
export type FishTrait = "slippery" | "linebreaker" | "deepdiver";

/** A fish that bites in rod fishing. Makes the items `fish.<id>` and `fish.<id>.<tier>`. */
export type Fish = {
    /** Must match the file name. */
    id: string;
    name: string;
    /** Which waters it bites in, how often, how hard quality is (config/fishing). */
    rarity: Rarity;
    icon: string;
    description: string;
    /** How long it fights. */
    stamina: number;
    /** Scales every move it makes; 1 is normal. */
    strength: number;
    /** Starting Distance; it escapes at this + 5. */
    distance: number;
    /** Weights: how often it picks each move. 0 = never. */
    moves: Record<FishIntent, number>;
    /** Special behaviour, in code. */
    traits?: FishTrait[];
    /** Fishing XP for landing one. */
    xp: number;
};

/**
 * A crop that grows on the farm. Its seed and what it gives are ordinary
 * `farming` materials with files of their own (`materials/farming/`).
 */
export type Crop = {
    /** Must match the file name. */
    id: string;
    name: string;
    icon: string;
    /** The seed item planted from the Seed Bag. */
    seed: string;
    /** The item a harvest gives. */
    produce: string;
    /** Advances from planting to ripe, each needing moisture. */
    stages: number;
    /** How many `produce` one harvest gives, before fertility and push bonuses. */
    yield: Range;
    /** Seeds back from a harvest. */
    seedsBack: Range;
    /** Fertility a harvest takes from its tile. */
    fertilityCost: number;
    /** Farming XP per harvest. */
    xp: number;
};

/** One possible pick in a chest pool, weighted against the others. */
export type ChestEntry = { itemId: string; weight: number; quantity: Range };

/** Rolls `rolls` weighted picks (repeats allowed) from `entries`. */
export type ChestPool = { rolls: Range; entries: ChestEntry[] };

/** A chest that may be in the selection. */
export type ChestOffer = {
    tier: GeoChestTier;
    /** 0–1. At least one offer needs 1, so a selection is never empty. */
    chance: number;
    /** At least one pool needs rolls.min ≥ 1. */
    pools: ChestPool[];
};

export type EnemyMove = {
    id: string;
    /** Shown when it's used. */
    name: string;
    /** Against its other moves: 3 vs 1 = 75% / 25%. */
    weight: number;
    /** What it does. `other` is the player. */
    actions: Action[];
};

export type Enemy = {
    /** Must match the file name. */
    id: string;
    name: string;
    /** The app's sprite name. */
    sprite: string;
    /** maxHealth, attack, defence, speed, critChance… Missing = 0. */
    stats: Record<string, number>;
    /** Each turn it picks one by weight. At least one. */
    moves: EnemyMove[];
    /** Innate rules, e.g. poisons on hit. */
    effects?: Effect[];
    /** Each rolled on its own on a win. chance 0–1. */
    loot?: { itemId: string; chance: number; quantity: number }[];
    /** A chance of a chest selection instead of `loot`. Coins and XP still come. */
    chests?: { chance: number; offers: ChestOffer[] };
    /** Gone from the map once it has beaten you. */
    leavesAfterWinning?: boolean;
    /** Coins on a kill. */
    coins?: Range;
    /** Combat XP for the kill. */
    xp: number;
};

/** Burning, Frozen, Well Fed… */
export type Status = {
    /** Must match the file name. */
    id: string;
    name: string;
    /** In the bearer's turns, counting the one it lands on. Omit = until removed. */
    duration?: number;
    /** Reapplying adds stacks up to this; 1 = refreshes instead. */
    maxStacks: number;
    /** Stat changes while it lasts. */
    modifiers?: StatModifier[];
    /** What it does while it lasts. `self` is the bearer. */
    effects?: Effect[];
};

/** Crafting and cooking: inputs used up, output made, per craft. */
export type Recipe = {
    /** Must match the file name. Usually the output's id. */
    id: string;
    /** Used up per craft. Each item once. */
    inputs: ItemAmount[];
    output: ItemAmount;
    /** Levels needed, never spent. Max 50. */
    skills?: { skill: string; level: number }[];
};

export type ItemKind = "card" | "equipment" | "talisman" | "material" | "consumable" | "misc";

/** An NPC shop. */
export type Vendor = {
    /** Must match the file name. */
    id: string;
    name: string;
    icon: string;
    description: string;
    /** Coins each, unlimited stock. Never under what any vendor pays back. */
    sells: { itemId: string; price: number; stock?: null }[];
    /** Buys items matching every rule given, paying their sellValue. {} = anything not Soulbound. */
    buys: {
        kinds?: ItemKind[];
        /** Matches cards and materials of these skills. */
        skills?: string[];
        itemIds?: string[];
    };
};

export type MayorPerk = {
    id: string;
    name: string;
    description: string;
    icon: string;
    /** Stat changes for every player while in office. [] = words only. */
    modifiers: StatModifier[];
};

export type Mayor = {
    /** Must match the file name. */
    id: string;
    name: string;
    perks: MayorPerk[];
};

// ---------------------------------------------------------------------------
// config/

export type PlayerConfig = {
    /** A player's stats before gear: maxHealth, attack, defence, speed, critChance, critMultiplier. */
    baseStats: Record<string, number>;
};

export type EquipSlot = "mainHand" | "offHand" | "head" | "chest" | "hands" | "legs" | "ring";

export type StarterKitConfig = {
    /** Granted to every new player. Cards are `card.<id>`. */
    items: ItemAmount[];
    /** Equipped on arrival; each must also be in `items`. */
    equip: Partial<Record<EquipSlot, string>>;
    /** Every starter card of these skills becomes that skill's first hand. */
    handSkills: string[];
    /** Packed into the lunchbox, slot by slot. */
    lunchbox: ItemAmount[];
    /** Packed into the bait slots, slot by slot. */
    bait: ItemAmount[];
    /** Packed into the Seed Bag, slot by slot. */
    seeds: ItemAmount[];
};

export type SpawnsConfig = {
    /** How far a fight can start, in metres; new spawns land within it. */
    reachMetres: number;
    /** New spawns land at least this far from the player. */
    minSpawnMetres: number;
    /** How long a spawn lingers once you're out of its reach. */
    outOfReachSeconds: number;
    /** A beaten spawn holds its slot this long. */
    respawnAfterWinSeconds: number;
    /** Weights for having 1, 2, 3… spawns at once; its length is the cap. */
    countWeights: number[];
    /** How long one roll of countWeights holds. */
    windowMinutes: number;
    /** At most one new spawn this often. */
    spawnGapSeconds: number;
    /** How long one spawn lasts. */
    lifetimeMinutes: { min: number; max: number };
    /** Which enemies spawn, how often. Unlisted enemies never spawn on their own. */
    enemies: { enemyId: string; weight: number }[];
};

export type FarmingConfig = {
    /** Labor each Farm Turn gives. */
    laborPerTurn: number;
    /** A Farm Turn comes in this often. */
    turnHours: number;
    /** Turns that can wait unspent; none come in past this. */
    maxTurnsBanked: number;
    /** Turns a new farm starts with. */
    startTurnsBanked: number;
    /** A new farm owns a square this many tiles across, in the middle of the grid. */
    startSize: number;
    /** Coins for the nth extra tile: first + step × (n − 1). */
    unlockCost: { first: number; step: number };
    /** Seed Bag slots a new player has. */
    seedBagSlots: number;
    /** Every tile's fertility to start. */
    startFertility: number;
    /** An empty owned tile gains this much fertility per Advance, up to `fallowCap`. */
    fallowRecovery: number;
    fallowCap: number;
    /** Harvest yield −1 at or below `low` fertility, +1 at or above `high`. */
    fertilityYield: { low: number; high: number };
    /** Harvest or push: rot chance on each Advance a ripe crop waits; the list's length caps the bonus. */
    rotChances: number[];
    /** Labor for the plain actions. */
    labor: { water: number; harvest: number; clear: number };
    /** PLACEHOLDER weather until real local weather: how often each comes. */
    weatherWeights: Record<GeoFarmWeather, number>;
};

export type FishingConfig = {
    /** Before gear and mayor perks, 0–1. */
    baseOdds: {
        /** Chance a catch is an eel. */
        eelChance: number;
        /** Chance a cast doesn't use up its bait. */
        baitSaveChance: number;
        /** Chance a catch is a sea creature to fight instead. */
        seaCreatureChance: number;
    };
    /** How often each rarity bites, when the water allows it. */
    rarityWeight: Record<Rarity, number>;
    /** Which rarities can bite in each water. */
    waterRarities: Record<GeoFishingTier, Rarity[]>;
    /** Quality thresholds × this: rarer fish need more Finesse. */
    rarityDifficulty: Record<Rarity, number>;
    /** Turns a clean fight should take. Past par, each turn costs 1 Finesse. */
    parTurns: Record<Rarity, number>;
    tuning: {
        /** The sweet zone's bottom, as a share of the line's cap. */
        zoneLow: number;
        /** The sweet zone's top. */
        zoneHigh: number;
        /** Finesse needed per quality tier. */
        tierThresholds: Record<GeoQualityTier, number>;
        /** A fight this long is lost. */
        maxTurns: number;
    };
    /** Every player fishes with this until rods are gear. */
    defaultRod: { name: string; power: number; line: number; maxTier: GeoQualityTier };
};

export type ElectionsConfig = {
    /** In office before any election has finished. */
    firstMayor: string;
    /** Mayors standing in each election. */
    candidates: number;
    /** An election ends at the first Monday 00:00 UTC at least this far away. */
    minHours: number;
};

export type EconomyConfig = {
    /** NPC sell value for items without their own sellValue. */
    placeholderSellValue: Record<Rarity, number>;
};

export type WeaponsConfig = {
    /** Weapon types, e.g. "dagger". Weapons and requiresWeapon use these. */
    types: string[];
    /** How weapons fight, e.g. "melee". */
    styles: string[];
};

export type ChestTiersConfig = {
    /** Shown name and coins to open (0 = free), for each of the fixed tiers. */
    tiers: { id: GeoChestTier; name: string; cost: number }[];
};
