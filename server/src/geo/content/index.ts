import { GEO_CHEST_TIERS, GEO_FARM_SIZE, GEO_MAX_SKILL_LEVEL, GEO_SEED_BAG_MAX_SLOTS } from "@cozy/shared/geo";
import type { Action, EffectDef } from "../engine/engine.types";
import { buildContent } from "./build";
import type { GameContent, ItemDef, VendorBuyRule } from "./content.types";
import { GameDataError, loadGameData } from "./data";
import type { GameData } from "./data.schema";
import { FARMING_CARD_IDS, isFarmingCardId } from "./farming";
import { FISHING_CARD_IDS, isFishingCardId } from "./fishing";

export type GameConfig = GameData["config"];

/** What an NPC pays for one of this item, in coins. A compact item is worth what it holds. */
function sellValueIn(content: GameContent, config: GameConfig, item: ItemDef): number {
    if (item.sellValue !== undefined) return item.sellValue;
    if (item.kind === "material" && item.compactOf) {
        const base = content.items[item.compactOf.itemId];
        if (base) return sellValueIn(content, config, base) * item.compactOf.ratio;
    }
    return config.economy.placeholderSellValue[item.rarity];
}

/** Whether a vendor with this rule buys this item. Cards and materials carry a skill. */
function vendorBuysIn(content: GameContent, rule: VendorBuyRule, item: ItemDef): boolean {
    if (item.soulbound) return false;
    if (rule.kinds && !rule.kinds.includes(item.kind)) return false;
    if (rule.itemIds && !rule.itemIds.includes(item.id)) return false;
    if (rule.skills) {
        const skill = item.kind === "material" ? item.skill : item.kind === "card" ? content.cards[item.cardId]?.skill : undefined;
        if (!skill || !rule.skills.includes(skill)) return false;
    }
    return true;
}

/** Status ids an action list applies, removes or asks about, effects included. */
function statusesUsed(actions: Action[] = [], effects: EffectDef[] = []): string[] {
    const fromActions = (list: Action[]) =>
        list.flatMap((action) => (action.type === "applyStatus" ? [action.status] : action.type === "removeStatus" ? [action.status] : []));
    const fromConditions = (effect: EffectDef) =>
        (effect.conditions ?? []).flatMap((condition) =>
            condition.type === "hasStatus" || condition.type === "lacksStatus" ? [condition.status] : [],
        );
    return [...fromActions(actions), ...effects.flatMap((effect) => [...fromActions(effect.actions), ...fromConditions(effect)])];
}

const isRange = ({ min, max }: { min: number; max: number }) => max >= min;

/**
 * Every rule that spans files: references exist, chests can't come out
 * empty, vendors can't print coins. Returns every problem found, so one
 * start shows them all.
 */
export function checkContent(content: GameContent, config: GameConfig): string[] {
    const problems: string[] = [];
    const item = (id: string) => content.items[id];
    const needItem = (where: string, id: string) => {
        if (!item(id)) problems.push(`${where} uses unknown item "${id}"`);
    };
    const needStatuses = (where: string, actions?: Action[], effects?: EffectDef[]) => {
        for (const id of statusesUsed(actions, effects)) {
            if (!content.statuses[id]) problems.push(`${where} uses unknown status "${id}"`);
        }
    };

    const weaponTags = new Set([...config.weapons.types, ...config.weapons.styles]);
    for (const card of Object.values(content.cards)) {
        needStatuses(`Card "${card.id}"`, card.actions, card.effects);
        for (const tag of card.requiresWeapon ?? []) {
            if (!weaponTags.has(tag)) problems.push(`Card "${card.id}" requires unknown weapon tag "${tag}" (config/weapons.ts)`);
        }
        if (card.skill === "fishing" && !isFishingCardId(card.id)) {
            problems.push(`Fishing card "${card.id}" has no rules in fishing/fishing-run.ts (known: ${FISHING_CARD_IDS.join(", ")})`);
        }
    }
    for (const id of FISHING_CARD_IDS) {
        if (!content.cards[id]) problems.push(`Fishing card "${id}" has rules in fishing/fishing-run.ts but no file in data/cards`);
    }
    for (const card of Object.values(content.cards)) {
        if (card.skill === "farming" && !isFarmingCardId(card.id)) {
            problems.push(`Farming card "${card.id}" has no rules in farming/farm.ts (known: ${FARMING_CARD_IDS.join(", ")})`);
        }
    }
    for (const id of FARMING_CARD_IDS) {
        if (!content.cards[id]) problems.push(`Farming card "${id}" has rules in farming/farm.ts but no file in data/cards`);
    }

    const seedsSeen = new Map<string, string>();
    for (const crop of Object.values(content.crops)) {
        for (const itemId of [crop.seed, crop.produce]) {
            const entry = item(itemId);
            if (!entry) problems.push(`Crop "${crop.id}" uses unknown item "${itemId}"`);
            else if (entry.kind !== "material" || entry.skill !== "farming") problems.push(`Crop "${crop.id}" uses "${itemId}", which isn't a farming material`);
        }
        const other = seedsSeen.get(crop.seed);
        if (other) problems.push(`Crops "${other}" and "${crop.id}" share the seed "${crop.seed}"`);
        seedsSeen.set(crop.seed, crop.id);
        if (!isRange(crop.yield) || !isRange(crop.seedsBack)) problems.push(`Crop "${crop.id}": a min is over its max`);
    }

    for (const entry of Object.values(content.items)) {
        if (entry.kind === "equipment" || entry.kind === "talisman") needStatuses(`Item "${entry.id}"`, [], entry.effects);
        if (entry.kind === "equipment") {
            for (const cardId of entry.unlocksCards ?? []) {
                if (!content.cards[cardId]) problems.push(`Item "${entry.id}" unlocks unknown card "${cardId}"`);
            }
            if (entry.weapon && !config.weapons.types.includes(entry.weapon.type)) {
                problems.push(`Weapon "${entry.id}" has unknown type "${entry.weapon.type}" (config/weapons.ts)`);
            }
            if (entry.weapon && !config.weapons.styles.includes(entry.weapon.style)) {
                problems.push(`Weapon "${entry.id}" has unknown style "${entry.weapon.style}" (config/weapons.ts)`);
            }
        }
    }
    for (const food of Object.values(content.foods)) needStatuses(`Food "${food.id}"`, food.actions, food.effects);
    for (const status of Object.values(content.statuses)) needStatuses(`Status "${status.id}"`, [], status.effects);

    for (const tier of GEO_CHEST_TIERS) {
        if (!content.chestTiers[tier]) problems.push(`Chest tier "${tier}" is missing from config/chest-tiers.ts`);
    }

    for (const enemy of Object.values(content.enemies)) {
        needStatuses(`Enemy "${enemy.id}"`, enemy.moves.flatMap((move) => move.actions), enemy.effects);
        for (const drop of enemy.loot) needItem(`Enemy "${enemy.id}" loot`, drop.itemId);
        if (enemy.coins && !isRange(enemy.coins)) problems.push(`Enemy "${enemy.id}" coins: min is over max`);
        // Every chest must give something: no empty pools, no zero rolls.
        const chests = enemy.chests;
        if (!chests) continue;
        const where = `Enemy "${enemy.id}" chests`;
        if (!chests.offers.some((offer) => offer.chance === 1)) {
            problems.push(`${where} need one offer with chance 1, so a selection is never empty`);
        }
        for (const offer of chests.offers) {
            if (offer.pools.length === 0 || !offer.pools.some((pool) => pool.rolls.min >= 1)) {
                problems.push(`${where}: "${offer.tier}" can come out empty`);
            }
            for (const pool of offer.pools) {
                if (!isRange(pool.rolls) || pool.entries.length === 0) problems.push(`${where}: "${offer.tier}" has a bad pool`);
                for (const entry of pool.entries) {
                    needItem(`${where}: "${offer.tier}"`, entry.itemId);
                    if (!isRange(entry.quantity)) problems.push(`${where}: "${offer.tier}" "${entry.itemId}" quantity min is over max`);
                }
            }
        }
    }

    const vendors = Object.values(content.vendors);
    for (const vendor of vendors) {
        for (const offer of vendor.sells) {
            const sold = item(offer.itemId);
            if (!sold) {
                problems.push(`Vendor "${vendor.id}" sells unknown item "${offer.itemId}"`);
                continue;
            }
            // Buying from one vendor and selling to another must never profit.
            const buyer = vendors.find((other) => vendorBuysIn(content, other.buys, sold));
            const value = sellValueIn(content, config, sold);
            if (buyer && offer.price < value) {
                problems.push(`Vendor "${vendor.id}" sells "${offer.itemId}" for ${offer.price}, under the ${value} "${buyer.id}" pays`);
            }
        }
        for (const itemId of vendor.buys.itemIds ?? []) needItem(`Vendor "${vendor.id}" buys`, itemId);
    }

    for (const recipe of Object.values(content.recipes)) {
        for (const { itemId } of [...recipe.inputs, recipe.output]) needItem(`Recipe "${recipe.id}"`, itemId);
        if (new Set(recipe.inputs.map((input) => input.itemId)).size !== recipe.inputs.length) {
            problems.push(`Recipe "${recipe.id}" lists an input twice`);
        }
        for (const { skill, level } of recipe.skills ?? []) {
            if (level > GEO_MAX_SKILL_LEVEL) problems.push(`Recipe "${recipe.id}" needs ${skill} ${level}, past the max of ${GEO_MAX_SKILL_LEVEL}`);
        }
    }

    const { elections, spawns, fishing, farming } = config;
    if (farming.startSize > GEO_FARM_SIZE || farming.startSize % 2 === 0) {
        problems.push(`config/farming.ts: startSize must be odd and at most ${GEO_FARM_SIZE}`);
    }
    if (farming.fertilityYield.low >= farming.fertilityYield.high) problems.push("config/farming.ts: fertilityYield low must be under high");
    if (farming.seedBagSlots > GEO_SEED_BAG_MAX_SLOTS) problems.push(`config/farming.ts: seedBagSlots is past ${GEO_SEED_BAG_MAX_SLOTS}`);
    if (!content.mayors[elections.firstMayor]) problems.push(`config/elections.ts: first mayor "${elections.firstMayor}" doesn't exist`);
    // Each election leaves the mayor in office out, so the pool needs one spare.
    if (Object.keys(content.mayors).length <= elections.candidates) {
        problems.push(`An election needs more than ${elections.candidates} mayors to pick ${elections.candidates} candidates`);
    }
    for (const { enemyId } of spawns.enemies) {
        if (!content.enemies[enemyId]) problems.push(`config/spawns.ts spawns unknown enemy "${enemyId}"`);
    }
    if (spawns.minSpawnMetres > spawns.reachMetres) problems.push("config/spawns.ts: minSpawnMetres is past reachMetres");
    if (spawns.lifetimeMinutes.min > spawns.lifetimeMinutes.max) problems.push("config/spawns.ts: lifetimeMinutes min is over max");
    if (fishing.tuning.zoneLow >= fishing.tuning.zoneHigh) problems.push("config/fishing.ts: zoneLow must be under zoneHigh");

    const kit = config["starter-kit"];
    for (const { itemId } of kit.items) needItem("config/starter-kit.ts items", itemId);
    for (const [slot, itemId] of Object.entries(kit.equip)) {
        const gear = item(itemId);
        if (gear?.kind !== "equipment" || gear.slot !== slot) problems.push(`config/starter-kit.ts equips "${itemId}", which isn't ${slot} gear`);
        else if (!kit.items.some((granted) => granted.itemId === itemId)) problems.push(`config/starter-kit.ts equips "${itemId}" without granting it`);
    }
    for (const { itemId } of kit.lunchbox) {
        if (!content.foods[itemId]) problems.push(`config/starter-kit.ts lunchbox has "${itemId}", which isn't food`);
    }
    for (const { itemId } of kit.seeds) {
        if (!Object.values(content.crops).some((crop) => crop.seed === itemId)) {
            problems.push(`config/starter-kit.ts seeds has "${itemId}", which no crop grows from`);
        }
    }
    if (kit.seeds.length > farming.seedBagSlots) problems.push("config/starter-kit.ts packs more seeds than a new Seed Bag has slots");
    for (const { itemId } of kit.bait) {
        const bait = item(itemId);
        if (bait?.kind !== "consumable" || !bait.bait) problems.push(`config/starter-kit.ts bait has "${itemId}", which isn't bait`);
    }
    return problems;
}

/** The checked data files, as loaded from `geo/data/`. */
const GAME_DATA = await loadGameData();
const built = buildContent(GAME_DATA);

/** Every tuning number in `data/config/`. */
export const GAME_CONFIG: GameConfig = GAME_DATA.config;

/**
 * All geo-game content, indexed by id, built from `geo/data/` at startup.
 * A bad file or broken reference fails the start, listing every problem.
 */
export const CONTENT: GameContent = built.content;

const problems = checkContent(CONTENT, GAME_CONFIG);
if (problems.length > 0) throw new GameDataError(problems);

export const sellValueOf = (item: ItemDef) => sellValueIn(CONTENT, GAME_CONFIG, item);
export const vendorBuys = (rule: VendorBuyRule, item: ItemDef) => vendorBuysIn(CONTENT, rule, item);

/** Bait that draws sea creatures and makes the bite come sooner. */
export const CHUM_BAIT_IDS = built.chumBaitIds;

const { fishing, elections } = GAME_CONFIG;
export const RARITY_WEIGHT = fishing.rarityWeight;
export const WATER_RARITIES = fishing.waterRarities;
export const RARITY_DIFFICULTY = fishing.rarityDifficulty;
export const PAR_TURNS = fishing.parTurns;
export const FISHING_TUNING = fishing.tuning;
/** PLACEHOLDER: every player fishes with this until rods are gear. */
export const DEFAULT_ROD = fishing.defaultRod;

/** Every farming tuning number (`data/config/farming.ts`). */
export const FARMING = GAME_CONFIG.farming;

export const ELECTION_RULES = elections;
/** In office before any election has finished. */
export const FIRST_MAYOR_ID = elections.firstMayor;

export type { EnemyDef, GameContent, ItemDef, MayorDef, RecipeDef, VendorDef } from "./content.types";
