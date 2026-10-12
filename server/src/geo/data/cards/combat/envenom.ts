import type { Card } from "#geo/models";

// PLACEHOLDER: crafted from Spider Fangs. What it does is still to be designed.
export default {
    id: "envenom",
    name: "Envenom",
    rarity: "rare",
    icon: "poison-bottle",
    description: "Spider venom, worked into a technique. What it does is still a secret.",
    skill: "combat",
    maxCharges: 10,
    targets: "enemy",
} satisfies Card;
