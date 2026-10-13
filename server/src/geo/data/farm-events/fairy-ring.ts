import type { FarmEvent } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "fairy-ring",
    name: "Fairy Ring",
    icon: "mushrooms-cluster",
    description: "Mushrooms in a perfect circle, overnight. The soil inside hums.",
    weight: 2,
    effect: { kind: "fairy-ring", fertility: 2, mutationBoost: 3 },
} satisfies FarmEvent;
