import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "nuclear-reactor",
    name: "Nuclear Reactor",
    rarity: "epic",
    icon: "nuclear-plant",
    description: "Enormous output. Enormous mess.",
    stats: [{ label: "Reactor", value: "Crops within 2 tiles grow an extra stage a cycle. 35% a cycle, nuclear waste lands within 2 tiles" }],
    effect: { kind: "reactor", radius: 2, growth: 1, wasteChance: 0.35 },
} satisfies Structure;
