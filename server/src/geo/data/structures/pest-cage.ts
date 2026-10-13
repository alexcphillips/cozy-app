import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "pest-cage",
    name: "Pest Cage",
    rarity: "uncommon",
    icon: "cage",
    description: "Keeps one pest alive and close. Some recipes like the company.",
    stats: [{ label: "Holds", value: "One caged pest: it counts as that pest nearby for mutations" }],
    effect: { kind: "cage" },
} satisfies Structure;
