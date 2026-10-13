import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "compost-bin",
    name: "Compost Bin",
    rarity: "common",
    icon: "barrel",
    description: "Waste in, soil out. Slowly.",
    stats: [{ label: "Compost", value: "Each harvest or clear adds 1 (up to 6). Each cycle spends 1: +1 fertility on the 8 tiles around" }],
    effect: { kind: "compost", capacity: 6 },
} satisfies Structure;
