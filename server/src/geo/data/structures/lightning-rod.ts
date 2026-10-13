import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "lightning-rod",
    name: "Lightning Rod",
    rarity: "rare",
    icon: "lightning-arc",
    description: "Tall, iron, and asking for trouble.",
    stats: [{ label: "Storms", value: "Crops within 1 tile can't be flattened. Some recipes need one nearby" }],
    effect: { kind: "lightning-rod", radius: 1 },
} satisfies Structure;
