import { z } from "zod";
import { GEO_CHEST_TIERS, GEO_FARM_SOILS, GEO_FARM_WEATHERS, GEO_FISHING_TIERS, GEO_QUALITY_TIERS } from "@cozy/shared/geo";
import type { Action, Amount, Condition, EffectDef, StatModifier } from "../engine/engine.types";
import type * as M from "./models";

/**
 * The runtime check of every file in `geo/data/`: what the editor checks
 * through the models (`models.ts`), the loader (`data.ts`) checks again as
 * it loads, and fills in defaults. The models are what you read; these are
 * kept equal to them by the checks at the bottom, which fail to compile if
 * the two drift apart.
 *
 * Objects are strict: a misspelt key ("maxCharge") is an error, not ignored.
 * A rule that needs other files (a card that exists, a weapon tag that's
 * listed) is checked after loading, in `content/index.ts`.
 */

const id = z.string().regex(/^[a-z0-9][a-z0-9.-]*$/, "use lower-case letters, digits, dots and dashes");
/** The id of another entry; checked after loading. */
const ref = z.string().min(1);
const count = z.int().min(1);
const fraction = z.number().min(0).max(1);
const range = (lowest: number) => z.strictObject({ min: z.int().min(lowest), max: z.int().min(lowest) });

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export const FISH_TRAITS = ["slippery", "linebreaker", "deepdiver"] as const;
export const FISH_INTENTS = ["run", "thrash", "dive", "rest", "jump"] as const;
const Rarity = z.enum(RARITIES);

// ---------------------------------------------------------------------------
// Engine rules: modifiers, effects, actions, conditions

const StatModifierSchema = z.strictObject({
    stat: z.string().min(1),
    kind: z.enum(["flat", "percent"]),
    value: z.number(),
}) satisfies z.ZodType<StatModifier>;

const Who = z
    .enum(["self", "other", "actor", "target"]);

const AmountSchema: z.ZodType<Amount, Amount> = z
    .union([
        z.number(),
        z.strictObject({
            stat: z.string().optional(),
            multiplier: z.number().optional(),
            flat: z.number().optional(),
            perStack: z.boolean().optional(),
        }),
    ]);

const ConditionSchema: z.ZodType<Condition, Condition> = z.lazy(() =>
    z.discriminatedUnion("type", [
        z.strictObject({ type: z.literal("hasStatus"), who: Who, status: ref }),
        z.strictObject({ type: z.literal("lacksStatus"), who: Who, status: ref }),
        z.strictObject({ type: z.literal("healthBelow"), who: Who, fraction: fraction }),
        z.strictObject({ type: z.literal("cardHasTag"), tag: z.string() }),
        z.strictObject({ type: z.literal("foodHasTag"), tag: z.string() }),
        z.strictObject({ type: z.literal("damageElement"), element: z.string() }),
        z.strictObject({ type: z.literal("damageFromStatus"), status: z.string().optional() }),
        z.strictObject({ type: z.literal("not"), condition: ConditionSchema }),
        z.strictObject({ type: z.literal("any"), conditions: z.array(ConditionSchema) }),
    ]),
);

const ActionSchema = z.discriminatedUnion("type", [
    z
        .strictObject({
            type: z.literal("attack"),
            to: Who,
            amount: AmountSchema,
            hits: count.optional(),
            element: z.string().optional(),
            delivery: z.enum(["melee", "projectile"]).optional(),
        }),
    z
        .strictObject({
            type: z.literal("damage"),
            to: Who,
            amount: AmountSchema,
            element: z.string().optional(),
            ignoreDefence: z.boolean().optional(),
        }),
    z.strictObject({ type: z.literal("heal"), to: Who, amount: AmountSchema }),
    z.strictObject({ type: z.literal("guard"), to: Who, amount: AmountSchema }),
    z.strictObject({
        type: z.literal("applyStatus"),
        to: Who,
        status: ref,
        stacks: count.optional(),
        duration: count.optional(),
    }),
    z.strictObject({ type: z.literal("removeStatus"), from: Who, status: ref }),
    z.strictObject({ type: z.literal("cancelAction") }),
    z.strictObject({ type: z.literal("freeCharge") }),
    z
        .strictObject({ type: z.literal("modifyDamage"), add: z.number().optional(), multiply: z.number().optional() }),
]) satisfies z.ZodType<Action>;

const EffectSchema = z.strictObject({
    id: z.string().min(1),
    trigger: z.strictObject({
        event: z.enum([
            "battleStart",
            "turnStart",
            "beforeAction",
            "cardPlayed",
            "foodEaten",
            "attacked",
            "beforeDamage",
            "damageTaken",
            "attackFinished",
            "turnEnd",
            "defeated",
        ]),
        as: z.enum(["actor", "target", "any"]).optional(),
    }),
    conditions: z.array(ConditionSchema).optional(),
    chance: fraction.optional(),
    actions: z.array(ActionSchema),
}) satisfies z.ZodType<EffectDef>;

const ItemStat = z.strictObject({ label: z.string(), value: z.string() });
const ItemAmount = z.strictObject({ itemId: ref, quantity: count });

// ---------------------------------------------------------------------------
// Items

/** Fields every item file has, for the app to draw it. */
const itemBase = {
    id,
    name: z.string().min(1),
    icon: z.string().min(1),
    rarity: Rarity,
    description: z.string(),
    stats: z.array(ItemStat).optional(),
    effectText: z.array(z.string()).optional(),
    sellValue: z
        .int()
        .min(0)
        .optional(),
};

const gearRules = {
    modifiers: z.array(StatModifierSchema).optional(),
    effects: z.array(EffectSchema).optional(),
};

const equipmentRules = {
    ...gearRules,
    unlocksCards: z.array(ref).optional(),
};

/** A card: its rules and the item you own, in one file. The item's id is `card.<id>`. */
const CardFile = z.strictObject({
    ...itemBase,
    skill: z.string().min(1),
    maxCharges: count,
    targets: z.enum(["enemy", "self"]),
    tags: z.array(z.string()).optional(),
    requiresWeapon: z
        .array(z.string())
        .optional(),
    actions: z.array(ActionSchema).default([]),
    effects: z.array(EffectSchema).optional(),
    finesse: z.enum(["raises", "lowers"]).optional(),
});

const WeaponFile = z.strictObject({
    ...itemBase,
    ...equipmentRules,
    weapon: z.strictObject({
        type: z.string().min(1),
        style: z.string().min(1),
    }),
});

const ArmourFile = z.strictObject({
    ...itemBase,
    ...equipmentRules,
    slot: z.enum(["offHand", "head", "chest", "hands", "legs"]),
});

const RingFile = z.strictObject({ ...itemBase, ...equipmentRules });

const TalismanFile = z.strictObject({ ...itemBase, ...gearRules });

const MaterialFile = z.strictObject({
    ...itemBase,
    skill: z.string().min(1),
    stackSize: count.default(999),
    compact: z
        .strictObject({ ratio: z.int().min(2) })
        .optional(),
});

const FoodFile = z.strictObject({
    ...itemBase,
    stackSize: count.default(99),
    heal: z.int().min(1).optional(),
    tags: z.array(z.string()).optional(),
    actions: z.array(ActionSchema).default([]),
    effects: z.array(EffectSchema).optional(),
});

const BaitFile = z.strictObject({
    ...itemBase,
    stackSize: count.default(99),
    scent: z.int().min(0),
    chum: z.boolean().optional(),
});

const MiscFile = z.strictObject({
    ...itemBase,
    kind: z.enum(["misc", "consumable"]).default("misc"),
    stackSize: count.default(99),
});

// ---------------------------------------------------------------------------
// Everything else

const FishFile = z.strictObject({
    id,
    name: z.string().min(1),
    rarity: Rarity,
    icon: z.string().min(1),
    description: z.string(),
    stamina: z.int().min(1),
    strength: z.number().positive(),
    distance: z.int().min(1),
    moves: z.record(z.enum(FISH_INTENTS), z.number().min(0)),
    traits: z.array(z.enum(FISH_TRAITS)).default([]),
    xp: z.int().min(0),
});

const CropFile = z.strictObject({
    id,
    name: z.string().min(1),
    icon: z.string().min(1),
    seed: ref,
    produce: ref,
    stages: count,
    yield: range(1),
    seedsBack: range(0),
    fertilityCost: z.int().min(0),
    xp: z.int().min(0),
});

const FarmEventFile = z.strictObject({
    id,
    name: z.string().min(1),
    icon: z.string().min(1),
    description: z.string(),
    weight: z.number().min(0),
    effect: z.discriminatedUnion("kind", [
        z.strictObject({ kind: z.literal("pest-swarm"), count }),
        z.strictObject({ kind: z.literal("fairy-ring"), fertility: count, mutationBoost: z.number().min(1) }),
        z.strictObject({ kind: z.literal("blood-moon"), pestBoost: z.number().min(1) }),
        z.strictObject({ kind: z.literal("bumper-harvest"), bonus: count }),
        z.strictObject({ kind: z.literal("merchant"), count, stock: z.array(z.strictObject({ itemId: ref, price: z.int().min(0) })).min(1) }),
        z.strictObject({ kind: z.literal("meteor-shower"), mutationBoost: z.number().min(1), dropChance: fraction, itemId: ref }),
    ]),
});

const StructureFile = z.strictObject({
    ...itemBase,
    effect: z.discriminatedUnion("kind", [
        z.strictObject({ kind: z.literal("jukebox"), boost: z.number().min(1) }),
        z.strictObject({ kind: z.literal("cage") }),
        z.strictObject({ kind: z.literal("beehive"), boost: z.number().min(1), swarmChance: fraction }),
        z.strictObject({ kind: z.literal("compost"), capacity: count }),
        z.strictObject({ kind: z.literal("pond") }),
        z.strictObject({ kind: z.literal("greenhouse") }),
        z.strictObject({ kind: z.literal("reactor"), radius: count, growth: count, wasteChance: fraction }),
        z.strictObject({ kind: z.literal("portal"), wave: count, pests: z.array(ref).min(1) }),
        z.strictObject({ kind: z.literal("shrine") }),
        z.strictObject({ kind: z.literal("well"), capacity: count, rain: z.int().min(0), storm: z.int().min(0), heatwave: z.int().min(0) }),
        z.strictObject({ kind: z.literal("lightning-rod"), radius: count }),
    ]),
});

const MutationFile = z.strictObject({
    id,
    name: z.string().min(1),
    icon: z.string().min(1),
    description: z.string(),
    produce: ref,
    stages: count,
    yield: range(1),
    fertilityCost: z.int().min(0),
    xp: z.int().min(0),
    recipe: z.strictObject({
        parents: z.array(z.strictObject({ cropId: ref, count })).min(1),
        weather: z.enum(GEO_FARM_WEATHERS).optional(),
        event: ref.optional(),
        pest: ref.optional(),
        minFertility: z.int().min(0).max(10).optional(),
        structure: ref.optional(),
        soil: z.enum(GEO_FARM_SOILS).optional(),
    }),
    chance: fraction,
    research: z.strictObject({ coins: z.int().min(0), xp: z.int().min(0) }),
});

const PestFile = z.strictObject({
    id,
    name: z.string().min(1),
    icon: z.string().min(1),
    description: z.string(),
    likes: z.array(ref),
    behaviour: z.discriminatedUnion("kind", [
        z.strictObject({ kind: z.literal("eat"), reach: count }),
        z.strictObject({ kind: z.literal("drain"), amount: count }),
        z.strictObject({ kind: z.literal("breed"), every: count }),
    ]),
    weight: z.number().min(0),
    hp: count.optional(),
    soils: z.array(z.enum(GEO_FARM_SOILS)).optional(),
    drops: z.array(z.strictObject({ itemId: ref, chance: fraction, quantity: range(1) })),
    xp: z.int().min(0),
    bounty: z.int().min(0).optional(),
});

const ChestTier = z.enum(GEO_CHEST_TIERS);

const EnemyFile = z.strictObject({
    id,
    name: z.string().min(1),
    sprite: z.string().min(1),
    stats: z.record(z.string(), z.number()),
    moves: z
        .array(
            z.strictObject({
                id: z.string().min(1),
                name: z.string().min(1),
                weight: z.number().positive(),
                actions: z.array(ActionSchema),
            }),
        )
        .min(1),
    effects: z.array(EffectSchema).optional(),
    loot: z.array(z.strictObject({ itemId: ref, chance: fraction, quantity: count })).default([]),
    chests: z
        .strictObject({
            chance: fraction,
            offers: z.array(
                z.strictObject({
                    tier: ChestTier,
                    chance: fraction,
                    pools: z.array(
                        z.strictObject({
                            rolls: range(0),
                            entries: z.array(
                                z.strictObject({ itemId: ref, weight: z.number().positive(), quantity: range(1) }),
                            ),
                        }),
                    ),
                }),
            ),
        })
        .optional(),
    leavesAfterWinning: z.boolean().optional(),
    coins: range(0).optional(),
    xp: z.int().min(0),
});

const StatusFile = z.strictObject({
    id,
    name: z.string().min(1),
    duration: count.optional(),
    maxStacks: count,
    modifiers: z.array(StatModifierSchema).optional(),
    effects: z.array(EffectSchema).optional(),
});

const RecipeFile = z.strictObject({
    id,
    inputs: z.array(ItemAmount).min(1),
    output: ItemAmount,
    skills: z
        .array(z.strictObject({ skill: z.string().min(1), level: count }))
        .optional(),
});

const VendorFile = z.strictObject({
    id,
    name: z.string().min(1),
    icon: z.string().min(1),
    description: z.string(),
    sells: z.array(
        z.strictObject({
            itemId: ref,
            price: count,
            stock: z.null().default(null),
        }),
    ),
    buys: z
        .strictObject({
            kinds: z.array(z.enum(["card", "equipment", "talisman", "material", "consumable", "misc"])).optional(),
            skills: z.array(z.string()).optional(),
            itemIds: z.array(ref).optional(),
        }),
});

const MayorFile = z.strictObject({
    id,
    name: z.string().min(1),
    perks: z.array(
        z.strictObject({
            id: z.string().min(1),
            name: z.string().min(1),
            description: z.string(),
            icon: z.string().min(1),
            modifiers: z.array(StatModifierSchema),
        }),
    ),
});

/**
 * Each folder of `data/` and what its files hold: one entry per file, named
 * by its id. Subfolders are for you to sort things; they mean nothing.
 */
export const DATA_FOLDERS = {
    cards: CardFile,
    weapons: WeaponFile,
    armour: ArmourFile,
    rings: RingFile,
    talismans: TalismanFile,
    materials: MaterialFile,
    food: FoodFile,
    bait: BaitFile,
    misc: MiscFile,
    fish: FishFile,
    crops: CropFile,
    pests: PestFile,
    mutations: MutationFile,
    structures: StructureFile,
    "farm-events": FarmEventFile,
    enemies: EnemyFile,
    statuses: StatusFile,
    recipes: RecipeFile,
    vendors: VendorFile,
    mayors: MayorFile,
} as const;

// ---------------------------------------------------------------------------
// config/: one file each, for tuning numbers that aren't a list of things

const byRarity = <T extends z.ZodType>(value: T) => z.record(Rarity, value);

const FishingConfig = z.strictObject({
    baseOdds: z.strictObject({
        eelChance: fraction,
        baitSaveChance: fraction,
        seaCreatureChance: fraction,
    }),
    rarityWeight: byRarity(z.number().min(0)),
    waterRarities: z.record(z.enum(GEO_FISHING_TIERS), z.array(Rarity).min(1)),
    rarityDifficulty: byRarity(z.number().positive()),
    parTurns: byRarity(count),
    tuning: z.strictObject({
        zoneLow: fraction,
        zoneHigh: fraction,
        tierThresholds: z.record(z.enum(GEO_QUALITY_TIERS), z.number().positive()),
        maxTurns: count,
    }),
    defaultRod: z
        .strictObject({ name: z.string(), power: z.int().min(0), line: count, maxTier: z.enum(GEO_QUALITY_TIERS) }),
    seaCreatures: z.record(
        z.enum(GEO_FISHING_TIERS),
        z.array(z.strictObject({ enemyId: id, weight: z.number().positive() })),
    ),
});

const FarmingConfig = z.strictObject({
    laborPerTurn: count,
    laborLevels: z.array(count),
    turnHours: z.number().positive(),
    maxTurnsAway: count,
    startSize: count,
    unlockCost: z.strictObject({ first: z.int().min(0), step: z.int().min(0) }),
    seedBagSlots: count,
    startFertility: z.int().min(0).max(10),
    fallowRecovery: z.int().min(0),
    fallowCap: z.int().min(0).max(10),
    fertilityYield: z.strictObject({ low: z.int().min(0).max(10), high: z.int().min(0).max(10) }),
    rotChances: z.array(fraction).min(1),
    labor: z.strictObject({ water: z.int().min(0), harvest: z.int().min(0), clear: z.int().min(0), swat: z.int().min(0), cage: z.int().min(0), scrub: z.int().min(0) }),
    waste: z.strictObject({ spreadChance: fraction, mutationBoost: z.number().min(1), pestChance: fraction, pest: ref }),
    soil: z.strictObject({
        richFallowCap: z.int().min(0).max(10),
        richRecovery: z.int().min(0),
        cursedYield: z.int().max(0),
        amendments: z.array(z.strictObject({ itemId: ref, soil: z.enum(GEO_FARM_SOILS) })),
        peatChance: fraction,
        peatItem: ref,
        ashItem: ref,
    }),
    shrine: z.strictObject({
        halfValue: z.number().positive(),
        curseShare: fraction,
        blessings: z
            .array(
                z.strictObject({
                    id: z.enum(["growth", "plenty", "mutation", "pests"]),
                    name: z.string().min(1),
                    description: z.string(),
                    turns: count,
                    weight: z.number().min(0),
                    curse: z.boolean(),
                }),
            )
            .min(1),
    }),
    pests: z.strictObject({ fromTurn: z.int().min(0), chancePerCrop: fraction, maxChance: fraction, max: z.int().min(0) }),
    pollinateBoost: z.number().min(1),
    events: z.strictObject({ fromTurn: z.int().min(0), chance: fraction }),
    orders: z.strictObject({ perWeek: z.int().min(0), value: range(1), rewardMultiplier: z.number().min(1), depositShare: fraction }),
    contests: z.strictObject({ prizes: z.array(z.int().min(0)), participation: z.int().min(0) }),
    pesthunter: z.strictObject({ shop: z.array(z.strictObject({ itemId: ref, price: count })) }),
    globalEvents: z.array(z.strictObject({ eventId: ref, days: z.int().min(1).max(7), weight: z.number().min(0) })),
    weatherWeights: z.record(z.enum(GEO_FARM_WEATHERS), z.number().min(0)),
    weather: z.strictObject({
        heatwaveC: z.number(),
        frostC: z.number(),
        rainMm: z.number().min(0),
        overcastCloud: z.number().min(0).max(100),
        regionDegrees: z.number().positive(),
        homeCooldownDays: z.number().min(0),
        stormFlattenChance: fraction,
        frostKillsUpToStage: z.int().min(0),
    }),
});

const PlayerConfig = z.strictObject({
    baseStats: z.record(z.string(), z.number()),
});

const SpawnsConfig = z.strictObject({
    reachMetres: z.number().positive(),
    minSpawnMetres: z.number().min(0),
    outOfReachSeconds: z.number().positive(),
    respawnAfterWinSeconds: z.number().min(0),
    countWeights: z.array(z.number().min(0)).min(1),
    windowMinutes: z.number().positive(),
    spawnGapSeconds: z.number().min(0),
    lifetimeMinutes: z.strictObject({ min: z.number().positive(), max: z.number().positive() }),
    enemies: z.array(z.strictObject({ enemyId: ref, weight: z.number().positive() })).min(1),
});

const StarterKitConfig = z.strictObject({
    items: z.array(ItemAmount),
    equip: z.partialRecord(z.enum(["mainHand", "offHand", "head", "chest", "hands", "legs", "ring"]), ref),
    handSkills: z.array(z.string()),
    lunchbox: z.array(ItemAmount),
    bait: z.array(ItemAmount),
    seeds: z.array(ItemAmount),
});

const ElectionsConfig = z.strictObject({
    firstMayor: ref,
    candidates: count,
    minHours: z.number().min(0),
});

const EconomyConfig = z.strictObject({
    placeholderSellValue: byRarity(z.int().min(0)),
});

const WeaponsConfig = z.strictObject({
    types: z.array(z.string().min(1)),
    styles: z.array(z.string().min(1)),
});

const ChestTiersConfig = z.strictObject({
    tiers: z.array(z.strictObject({ id: ChestTier, name: z.string().min(1), cost: z.int().min(0) })),
});

/** `data/config/<file>.ts`, each required. */
export const CONFIG_FILES = {
    fishing: FishingConfig,
    farming: FarmingConfig,
    player: PlayerConfig,
    spawns: SpawnsConfig,
    "starter-kit": StarterKitConfig,
    elections: ElectionsConfig,
    economy: EconomyConfig,
    weapons: WeaponsConfig,
    "chest-tiers": ChestTiersConfig,
} as const;

export type DataFolder = keyof typeof DATA_FOLDERS;
export type ConfigFile = keyof typeof CONFIG_FILES;

/** What the loader hands over: every folder's entries, checked, with defaults filled in. */
export type GameData = { [F in DataFolder]: z.output<(typeof DATA_FOLDERS)[F]>[] } & {
    config: { [C in ConfigFile]: z.output<(typeof CONFIG_FILES)[C]> };
};

// ---------------------------------------------------------------------------
// Each schema accepts exactly its model: a field added to one and not the
// other fails `npm run typecheck` here.

type Assignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Each assignable to the other, with the same fields: an optional field added to only one counts. */
type Same<A, B> = Assignable<A, B> extends true ? Assignable<keyof A, keyof B> : false;
const folderModels: { [K in DataFolder]: Same<z.input<(typeof DATA_FOLDERS)[K]>, ModelOf[K]> } = {
    cards: true,
    weapons: true,
    armour: true,
    rings: true,
    talismans: true,
    materials: true,
    food: true,
    bait: true,
    misc: true,
    fish: true,
    crops: true,
    pests: true,
    mutations: true,
    structures: true,
    "farm-events": true,
    enemies: true,
    statuses: true,
    recipes: true,
    vendors: true,
    mayors: true,
};
const configModels: { [K in ConfigFile]: Same<z.input<(typeof CONFIG_FILES)[K]>, ConfigModelOf[K]> } = {
    fishing: true,
    farming: true,
    player: true,
    spawns: true,
    "starter-kit": true,
    elections: true,
    economy: true,
    weapons: true,
    "chest-tiers": true,
};
void folderModels;
void configModels;

/** Each folder's model. */
export type ModelOf = {
    cards: M.Card;
    weapons: M.Weapon;
    armour: M.Armour;
    rings: M.Ring;
    talismans: M.Talisman;
    materials: M.Material;
    food: M.Food;
    bait: M.Bait;
    misc: M.MiscItem;
    fish: M.Fish;
    crops: M.Crop;
    pests: M.Pest;
    mutations: M.Mutation;
    structures: M.Structure;
    "farm-events": M.FarmEvent;
    enemies: M.Enemy;
    statuses: M.Status;
    recipes: M.Recipe;
    vendors: M.Vendor;
    mayors: M.Mayor;
};

/** Each config file's model. */
export type ConfigModelOf = {
    fishing: M.FishingConfig;
    farming: M.FarmingConfig;
    player: M.PlayerConfig;
    spawns: M.SpawnsConfig;
    "starter-kit": M.StarterKitConfig;
    elections: M.ElectionsConfig;
    economy: M.EconomyConfig;
    weapons: M.WeaponsConfig;
    "chest-tiers": M.ChestTiersConfig;
};
