import type { Request, Response } from "express";
import type { GeoContentResponse, GeoItemSource, GeoItemStat, GeoItemView, GeoRecipe } from "@cozy/shared/geo";
import type { StatId, StatModifier } from "../../engine/engine.types";
import { CONTENT, sellValueOf, type ItemDef, type RecipeDef } from "../../content";

const STAT_LABELS: Partial<Record<StatId, string>> = {
    maxHealth: "Max Health",
    attack: "Attack",
    defence: "Defence",
    speed: "Speed",
    critChance: "Crit Chance",
    critMultiplier: "Crit Damage",
};

/** Fractions, shown as percentages even when flat (+0.05 → +5%). */
const FRACTION_STATS = new Set<StatId>(["critChance", "critMultiplier"]);

/** "Defence +6", "Attack +10%": the modifier as the app shows it. */
function modifierRow(modifier: StatModifier): GeoItemStat {
    const label = STAT_LABELS[modifier.stat] ?? modifier.stat;
    const asPercent = modifier.kind === "percent" || FRACTION_STATS.has(modifier.stat);
    const amount = asPercent ? `${Math.round(modifier.value * 100)}%` : `${modifier.value}`;
    return { label, value: modifier.value < 0 ? amount : `+${amount}` };
}

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Rows the server works out from the rules: a weapon's type, a card's weapon requirement. */
function ruleRows(item: ItemDef): GeoItemStat[] {
    if (item.kind === "equipment" && item.weapon) {
        return [{ label: "Type", value: `${capitalise(item.weapon.type)} · ${capitalise(item.weapon.style)}` }];
    }
    const requires = item.kind === "card" ? CONTENT.cards[item.cardId]?.requiresWeapon : undefined;
    return requires ? [{ label: "Requires", value: requires.map(capitalise).join(" or ") }] : [];
}

function toItemView(item: ItemDef): GeoItemView {
    const modifiers = item.kind === "equipment" || item.kind === "talisman" ? (item.modifiers ?? []) : [];
    const base = {
        id: item.id,
        kind: item.kind,
        name: item.name,
        icon: item.icon,
        rarity: item.rarity,
        description: item.description,
        stats: [...ruleRows(item), ...modifiers.map(modifierRow), ...(item.stats ?? [])],
        effects: item.effectText ?? [],
        sellValue: sellValueOf(item),
        ...(item.quality && { quality: item.quality }),
        ...(item.soulbound && { soulbound: true }),
    };
    switch (item.kind) {
        case "card":
            return {
                ...base,
                skill: CONTENT.cards[item.cardId]?.skill,
                maxCharges: item.maxCharges,
                ...(item.finesse && { finesse: item.finesse }),
            };
        case "equipment":
            return {
                ...base,
                slot: item.slot,
                unlocksCards: item.unlocksCards?.map((cardId) => CONTENT.cards[cardId]?.name ?? cardId),
            };
        case "material":
            return { ...base, skill: item.skill };
        case "consumable":
            return {
                ...base,
                ...(item.food && { food: { tags: item.food.tags ?? [] } }),
                ...(item.bait && { bait: true }),
            };
        case "talisman":
        case "misc":
            return base;
    }
}

function toRecipeView(recipe: RecipeDef): GeoRecipe {
    return { id: recipe.id, inputs: recipe.inputs, output: recipe.output, skills: recipe.skills ?? [] };
}

/** Where items come from: enemy drops and vendor stock. Crafting is in the recipes. */
function itemSources(): GeoItemSource[] {
    const drops = Object.values(CONTENT.enemies).flatMap((enemy) =>
        enemy.loot.map(
            (drop): GeoItemSource => ({
                kind: "enemy",
                itemId: drop.itemId,
                name: enemy.name,
                chance: drop.chance,
                quantity: drop.quantity,
            }),
        ),
    );
    const stock = Object.values(CONTENT.vendors).flatMap((vendor) =>
        vendor.sells.map((offer): GeoItemSource => ({ kind: "vendor", itemId: offer.itemId, name: vendor.name })),
    );
    return [...drops, ...stock];
}

/** Item names, icons and rarities, so the app can draw an inventory; and every recipe. */
export async function getContent(_req: Request, res: Response) {
    const body: GeoContentResponse = {
        items: Object.values(CONTENT.items).map(toItemView),
        recipes: Object.values(CONTENT.recipes).map(toRecipeView),
        sources: itemSources(),
    };
    res.status(200).json(body);
}

export async function getHealth(_req: Request, res: Response) {
    res.status(200).json({ ok: true });
}
