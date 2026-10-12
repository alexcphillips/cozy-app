import { GEO_QUALITY_TIERS, type GeoChestTier, type GeoQualityTier } from "@cozy/shared/geo";
import type { CardDef, FoodDef, StatusDef } from "../engine/engine.types";
import type { GameData } from "./data.schema";
import type { ChestTierDef, EnemyDef, GameContent, ItemDef, MayorDef, RecipeDef, VendorDef } from "./content.types";
import { fishItemId, qualityFishItemId, type FishDef } from "./fishing";

/**
 * Turns the loaded data files into the game's content: one item per card,
 * a compact item and recipe per `compact` material, a regular and a
 * Soulbound item per fish per quality tier, and so on. Pure: no checks
 * beyond duplicate ids (`content/index.ts` checks references).
 */

/** Item fields every kind shares, in the order the app reads them. */
function itemBase(entry: Pick<ItemDef, "id" | "name" | "icon" | "rarity" | "description" | "stats" | "effectText" | "sellValue">) {
    const { id, name, icon, rarity, description, stats, effectText, sellValue } = entry;
    return { id, name, icon, rarity, description, stats, effectText, sellValue };
}

export const compactId = (itemId: string) => `compact-${itemId}`;

const TIER_LABELS: Record<GeoQualityTier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", ruby: "Ruby" };

export type BuiltContent = {
    content: GameContent;
    /** Bait ids that draw sea creatures and make the bite come sooner. */
    chumBaitIds: Set<string>;
};

function byId<T extends { id: string }>(list: T[], kind: string): Record<string, T> {
    const map: Record<string, T> = {};
    for (const entry of list) {
        if (map[entry.id]) throw new Error(`Duplicate ${kind} id "${entry.id}"`);
        map[entry.id] = entry;
    }
    return map;
}

export function buildContent(data: GameData): BuiltContent {
    const cards: CardDef[] = data.cards.map((card) => ({
        id: card.id,
        name: card.name,
        skill: card.skill,
        tags: card.tags,
        targets: card.targets,
        actions: card.actions,
        effects: card.effects,
        requiresWeapon: card.requiresWeapon,
    }));

    const items: ItemDef[] = [];
    for (const card of data.cards) {
        items.push({ ...itemBase(card), id: `card.${card.id}`, kind: "card", cardId: card.id, maxCharges: card.maxCharges, finesse: card.finesse });
    }
    const gear = (entry: GameData["weapons"][number] | GameData["armour"][number] | GameData["rings"][number]) => ({
        modifiers: entry.modifiers,
        effects: entry.effects,
        unlocksCards: entry.unlocksCards,
    });
    for (const weapon of data.weapons) {
        items.push({ ...itemBase(weapon), kind: "equipment", slot: "mainHand", weapon: weapon.weapon, ...gear(weapon) });
    }
    for (const armour of data.armour) items.push({ ...itemBase(armour), kind: "equipment", slot: armour.slot, ...gear(armour) });
    for (const ring of data.rings) items.push({ ...itemBase(ring), kind: "equipment", slot: "ring", ...gear(ring) });
    for (const talisman of data.talismans) {
        items.push({ ...itemBase(talisman), kind: "talisman", modifiers: talisman.modifiers, effects: talisman.effects });
    }

    const recipes: RecipeDef[] = data.recipes;
    for (const material of data.materials) {
        items.push({ ...itemBase(material), kind: "material", skill: material.skill, stackSize: material.stackSize });
        if (!material.compact) continue;
        // A compact item never breaks back down: one recipe, one way.
        const { ratio } = material.compact;
        const amount = ratio.toLocaleString("en");
        items.push({
            id: compactId(material.id),
            kind: "material",
            name: `Compact ${material.name}`,
            icon: material.icon,
            rarity: material.rarity,
            description: `${amount} ${material.name}, pressed into one. There's no getting them back out.`,
            stats: [{ label: "Contains", value: `${amount} ${material.name}` }],
            skill: material.skill,
            stackSize: material.stackSize,
            compactOf: { itemId: material.id, ratio },
        });
        recipes.push({
            id: compactId(material.id),
            inputs: [{ itemId: material.id, quantity: ratio }],
            output: { itemId: compactId(material.id), quantity: 1 },
        });
    }

    for (const food of data.food) {
        const heal = food.heal === undefined ? [] : [{ type: "heal" as const, to: "self" as const, amount: food.heal }];
        const healRow = food.heal === undefined ? [] : [{ label: "Heals", value: `${food.heal}` }];
        items.push({
            ...itemBase(food),
            kind: "consumable",
            stackSize: food.stackSize,
            stats: [...healRow, ...(food.stats ?? [])],
            food: { tags: food.tags, actions: [...heal, ...food.actions], effects: food.effects },
        });
    }
    for (const bait of data.bait) {
        items.push({ ...itemBase(bait), kind: "consumable", stackSize: bait.stackSize, bait: { scent: bait.scent } });
    }
    for (const misc of data.misc) items.push({ ...itemBase(misc), kind: misc.kind, stackSize: misc.stackSize });

    // Every fish is a regular, tradable material, plus a Soulbound item per
    // quality tier: account-bound, for the collection log, quests or a fillet.
    const fish: FishDef[] = data.fish;
    for (const entry of fish) {
        const base = { kind: "material", skill: "fishing", stackSize: 999, name: entry.name, icon: entry.icon, rarity: entry.rarity } as const;
        items.push({ ...base, id: fishItemId(entry.id), description: entry.description });
        for (const tier of GEO_QUALITY_TIERS) {
            items.push({
                ...base,
                id: qualityFishItemId(entry.id, tier),
                description: `A ${TIER_LABELS[tier]}-quality ${entry.name.toLowerCase()}. Soulbound: turn it in at the Angler for the collection log, or fillet it.`,
                quality: tier,
                soulbound: true,
                // Never sold: a Soulbound item has no NPC price.
                sellValue: 0,
            });
        }
    }

    const foods: FoodDef[] = items.flatMap((item) =>
        item.kind === "consumable" && item.food ? [{ id: item.id, name: item.name, ...item.food }] : [],
    );

    const content: GameContent = {
        statuses: byId<StatusDef>(data.statuses, "status"),
        cards: byId(cards, "card"),
        foods: byId(foods, "food"),
        items: byId(items, "item"),
        fish: byId(fish, "fish"),
        enemies: byId<EnemyDef>(data.enemies, "enemy"),
        vendors: byId<VendorDef>(data.vendors, "vendor"),
        mayors: byId<MayorDef>(data.mayors, "mayor"),
        recipes: byId(recipes, "recipe"),
        chestTiers: byId<ChestTierDef>(data.config["chest-tiers"].tiers, "chest tier") as Record<GeoChestTier, ChestTierDef>,
    };
    return { content, chumBaitIds: new Set(data.bait.filter((bait) => bait.chum).map((bait) => bait.id)) };
}
