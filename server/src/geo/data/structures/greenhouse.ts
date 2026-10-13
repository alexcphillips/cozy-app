import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "greenhouse",
    name: "Greenhouse",
    rarity: "rare",
    icon: "greenhouse",
    description: "Glass on every side. Safe, steady, and a little dull.",
    stats: [{ label: "Shelters", value: "The 8 tiles around: no weather, no pests arrive, no mutations sprout" }],
    effect: { kind: "greenhouse" },
} satisfies Structure;
