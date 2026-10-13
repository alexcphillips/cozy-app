import type { Material } from "#geo/models";

export default {
    id: "stormcorn",
    name: "Stormcorn",
    rarity: "epic",
    icon: "lightning-storm",
    description: "Every kernel crackles. Don't eat it near anything metal.",
    stats: [{ label: "From", value: "A mutation" }],
    sellValue: 150,
    skill: "farming",
} satisfies Material;
