import type { GeoItemStat } from "@cozy/shared/geo";
import type { StatId, StatModifier } from "../engine/engine.types";

const STAT_LABELS: Partial<Record<StatId, string>> = {
    maxHealth: "Max Health",
    attack: "Attack",
    defence: "Defence",
    speed: "Speed",
    critChance: "Crit Chance",
    critMultiplier: "Crit Damage",
    intelligence: "Intelligence",
    mending: "Mending",
    magicFind: "Magic Find",
};

/** Fractions, shown as percentages even when flat (+0.05 → +5%). */
const FRACTION_STATS = new Set<StatId>(["critChance", "critMultiplier"]);

/** Up to two decimals, without trailing zeros: 0.3 × 7 shows as 2.1, not 2.0999999999999996. */
const tidy = (value: number) => `${Math.round(value * 100) / 100}`;

/** "Defence +6", "Attack +10%": the modifier as the app shows it. */
export function modifierRow(modifier: StatModifier): GeoItemStat {
    const label = STAT_LABELS[modifier.stat] ?? modifier.stat;
    const asPercent = modifier.kind === "percent" || FRACTION_STATS.has(modifier.stat);
    const amount = asPercent ? `${tidy(modifier.value * 100)}%` : tidy(modifier.value);
    return { label, value: modifier.value < 0 ? amount : `+${amount}` };
}
