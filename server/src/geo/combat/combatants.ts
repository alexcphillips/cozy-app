import type { CombatantSetup } from "../engine/battle";
import { GEO_COMBAT_DAMAGE_PER_LEVEL, type GeoChestTier } from "@cozy/shared/geo";
import {
    DAMAGE_DEALT_STAT,
    type CardInstance,
    type EffectDef,
    type LunchboxSlot,
    type StatModifier,
    type Stats,
} from "../engine/engine.types";
import type { Rng } from "../engine/rng";
import { GAME_CONFIG, type GameContent } from "../content";
import type { ChestLootPool } from "../content/content.types";

/**
 * PLACEHOLDER player base stats, before gear (`data/config/player.ts`).
 * Gear and talismans add to these; levels may later too.
 */
export const PLAYER_BASE_STATS: Stats = GAME_CONFIG.player.baseStats;

export const PLAYER_COMBATANT_ID = "player";

export type PlayerLoadout = {
    name: string;
    /** Item ids of what's equipped, any slot. */
    equipment: string[];
    /** Item ids of the talismans in the bag, one per talisman. */
    talismans: string[];
    hand: CardInstance[];
    /** Food packed for the Run. */
    lunchbox?: LunchboxSlot[];
    /** Global effects in force, e.g. the mayor's perks. Stat modifiers only. */
    globalModifiers?: StatModifier[];
    /** 1–50: each level adds GEO_COMBAT_DAMAGE_PER_LEVEL to all damage dealt. */
    combatLevel?: number;
};

/**
 * The player as a combatant: base stats, plus every modifier and effect from
 * equipment and talismans. Unknown item ids are skipped, so a removed item
 * can't break an old save.
 */
export function playerCombatant(loadout: PlayerLoadout, content: GameContent): CombatantSetup {
    const modifiers: StatModifier[] = [...(loadout.globalModifiers ?? [])];
    if (loadout.combatLevel) {
        modifiers.push({ stat: DAMAGE_DEALT_STAT, kind: "flat", value: loadout.combatLevel * GEO_COMBAT_DAMAGE_PER_LEVEL });
    }
    const effects: EffectDef[] = [];
    let weaponTags: string[] = [];

    // A Set as well, so a duplicate talisman can never count twice.
    for (const itemId of [...loadout.equipment, ...new Set(loadout.talismans)]) {
        const item = content.items[itemId];
        if (!item || (item.kind !== "equipment" && item.kind !== "talisman")) continue;
        modifiers.push(...(item.modifiers ?? []));
        effects.push(...(item.effects ?? []));
        if (item.kind === "equipment" && item.weapon) weaponTags = [item.weapon.type, item.weapon.style];
    }

    return {
        id: PLAYER_COMBATANT_ID,
        side: "player",
        name: loadout.name,
        baseStats: PLAYER_BASE_STATS,
        modifiers,
        effects,
        hand: loadout.hand,
        lunchbox: loadout.lunchbox ?? [],
        weaponTags,
    };
}

/** An enemy as a combatant. `index` keeps ids unique when several fight. */
export function enemyCombatant(enemyId: string, index: number, content: GameContent): CombatantSetup {
    const enemy = content.enemies[enemyId];
    if (!enemy) throw new Error(`Unknown enemy "${enemyId}"`);
    return {
        id: `enemy:${index}`,
        side: "enemy",
        name: enemy.name,
        baseStats: enemy.stats,
        modifiers: [],
        effects: enemy.effects ?? [],
        moves: enemy.moves,
    };
}

export type Drop = { itemId: string; quantity: number };

/** Coins an enemy drops on a kill; 0 for one that carries none. */
export function rollCoins(enemyId: string, rng: Rng, content: GameContent): number {
    const coins = content.enemies[enemyId]?.coins;
    if (!coins) return 0;
    return coins.min + Math.floor(rng.next() * (coins.max - coins.min + 1));
}

/** Rolls an enemy's loot table. Each entry is its own roll. */
export function rollLoot(enemyId: string, rng: Rng, content: GameContent): Drop[] {
    const enemy = content.enemies[enemyId];
    if (!enemy) return [];
    return enemy.loot
        .filter((entry) => rng.chance(entry.chance))
        .map((entry) => ({ itemId: entry.itemId, quantity: entry.quantity }));
}

/** A chest as won: closed, but with its contents already rolled. */
export type RolledChest = { tier: GeoChestTier; name: string; cost: number; items: Drop[] };

/**
 * Rolls whether an enemy gives a chest selection, and if so which chests and
 * what's in each. Everything is rolled now, at the win, so reopening the app
 * can't reroll a chest. Null when it gives its loot list instead.
 */
export function rollChests(enemyId: string, rng: Rng, content: GameContent): RolledChest[] | null {
    const reward = content.enemies[enemyId]?.chests;
    if (!reward || !rng.chance(reward.chance)) return null;
    return reward.offers
        .filter((offer) => rng.chance(offer.chance))
        .map((offer) => {
            const tier = content.chestTiers[offer.tier];
            return { tier: offer.tier, name: tier.name, cost: tier.cost, items: rollPools(offer.pools, rng) };
        });
}

function rollBetween(range: { min: number; max: number }, rng: Rng): number {
    return range.min + Math.floor(rng.next() * (range.max - range.min + 1));
}

/** Each pool's rolls, each a weighted pick. The same item twice joins up. */
function rollPools(pools: ChestLootPool[], rng: Rng): Drop[] {
    const drops: Drop[] = [];
    for (const pool of pools) {
        const total = pool.entries.reduce((sum, entry) => sum + entry.weight, 0);
        for (let roll = rollBetween(pool.rolls, rng); roll > 0; roll--) {
            let left = rng.next() * total;
            const entry = pool.entries.find((candidate) => (left -= candidate.weight) < 0) ?? pool.entries.at(-1)!;
            const quantity = rollBetween(entry.quantity, rng);
            const same = drops.find((drop) => drop.itemId === entry.itemId);
            if (same) same.quantity += quantity;
            else drops.push({ itemId: entry.itemId, quantity });
        }
    }
    return drops;
}
