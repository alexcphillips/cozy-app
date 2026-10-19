import { GEO_QUALITY_TIERS, type GeoChestTier, type GeoQualityTier } from "@cozy/shared/geo";
import type { CardDef, FoodDef, StatusDef } from "../engine/engine.types";
import type { GameData } from "./data.schema";
import type { ChestTierDef, DungeonDef, EnemyDef, GameContent, ItemDef, MayorDef, PetDef, QuestDef, Rarity, RecipeDef, ReforgeDef, VendorDef } from "./content.types";
import { structureItemId, type CropDef, type FarmEventDef, type MutationDef, type PestDef, type StructureDef } from "./farming";
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

/** The item for one pet at one rarity, e.g. `pet.tarantula.rare`. */
export const petItemId = (petId: string, rarity: Rarity) => `pet.${petId}.${rarity}`;

const TIER_LABELS: Record<GeoQualityTier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", ruby: "Ruby" };
const RARITY_LABELS: Record<Rarity, string> = { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" };

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
        requiresOffHand: card.requiresOffHand,
        playableIf: card.playableIf,
    }));

    const items: ItemDef[] = [];
    for (const card of data.cards) {
        items.push({ ...itemBase(card), id: `card.${card.id}`, kind: "card", cardId: card.id, maxCharges: card.maxCharges, finesse: card.finesse });
    }
    const gear = (entry: GameData["weapons"][number] | GameData["armor"][number] | GameData["rings"][number] | GameData["amulets"][number] | GameData["rods"][number]) => ({
        modifiers: entry.modifiers,
        effects: entry.effects,
        unlocksCards: entry.unlocksCards,
        skills: entry.skills,
    });
    for (const weapon of data.weapons) {
        items.push({ ...itemBase(weapon), kind: "equipment", slot: "mainHand", weapon: weapon.weapon, ...gear(weapon) });
    }
    for (const armor of data.armor) {
        items.push({ ...itemBase(armor), kind: "equipment", slot: armor.slot, offHand: armor.offHand, ...gear(armor) });
    }
    for (const ring of data.rings) items.push({ ...itemBase(ring), kind: "equipment", slot: "ring", ...gear(ring) });
    for (const amulet of data.amulets) items.push({ ...itemBase(amulet), kind: "equipment", slot: "amulet", ...gear(amulet) });
    for (const rod of data.rods) {
        const rows = [
            { label: "Fishing Power", value: `+${rod.rod.power}` },
            { label: "Line", value: `${rod.rod.line}` },
            { label: "Hooks", value: `Up to ${RARITY_LABELS[rod.rod.maxRarity]}` },
            { label: "Quality", value: rod.rod.maxTier ? `Up to ${TIER_LABELS[rod.rod.maxTier]}` : "None" },
        ];
        const base = itemBase(rod);
        items.push({ ...base, stats: [...rows, ...(base.stats ?? [])], kind: "equipment", slot: "mainHand", rod: rod.rod, ...gear(rod) });
    }
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

    const pets: PetDef[] = data.pets;
    for (const pet of pets) {
        for (const rarity of pet.rarities) {
            items.push({
                id: petItemId(pet.id, rarity),
                kind: "pet",
                petId: pet.id,
                name: pet.name,
                icon: pet.icon,
                rarity,
                description: pet.description,
                sellValue: pet.sellValue?.[rarity],
            });
        }
    }
    for (const held of data["pet-items"]) {
        items.push({ ...itemBase(held), kind: "petItem", stackSize: held.stackSize, modifiers: held.modifiers, xpBoost: held.xpBoost });
    }
    const structures: StructureDef[] = data.structures.map((entry) => ({
        id: entry.id,
        name: entry.name,
        icon: entry.icon,
        description: entry.description,
        itemId: structureItemId(entry.id),
        effect: entry.effect,
    }));
    for (const entry of data.structures) {
        items.push({
            ...itemBase(entry),
            id: structureItemId(entry.id),
            kind: "misc",
            stackSize: 10,
            stats: [{ label: "Farm structure", value: "Place it on an empty tile of your farm" }, ...(entry.stats ?? [])],
        });
    }

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
        pets: byId(pets, "pet"),
        fish: byId(fish, "fish"),
        crops: byId<CropDef>(data.crops, "crop"),
        pests: byId<PestDef>(
            data.pests.map((pest) => ({ ...pest, hp: pest.hp ?? 1, bounty: pest.bounty ?? 0 })),
            "pest",
        ),
        mutations: byId<MutationDef>(data.mutations, "mutation"),
        structures: byId(structures, "structure"),
        farmEvents: byId<FarmEventDef>(data["farm-events"], "farm event"),
        enemies: byId<EnemyDef>(data.enemies, "enemy"),
        vendors: byId<VendorDef>(data.vendors, "vendor"),
        reforges: byId<ReforgeDef>(data.reforges, "reforge"),
        mayors: byId<MayorDef>(data.mayors, "mayor"),
        dungeons: byId<DungeonDef>(
            data.dungeons.map((dungeon) => ({ ...dungeon, bossModifiers: dungeon.bossModifiers ?? [] })),
            "dungeon",
        ),
        quests: byId<QuestDef>(
            data.quests.map((quest) => ({
                ...quest,
                giver: quest.giver ?? null,
                rewards: { coins: quest.rewards.coins ?? 0, items: quest.rewards.items ?? [] },
            })),
            "quest",
        ),
        recipes: byId(recipes, "recipe"),
        chestTiers: byId<ChestTierDef>(data.config["chest-tiers"].tiers, "chest tier") as Record<GeoChestTier, ChestTierDef>,
    };
    return { content, chumBaitIds: new Set(data.bait.filter((bait) => bait.chum).map((bait) => bait.id)) };
}
