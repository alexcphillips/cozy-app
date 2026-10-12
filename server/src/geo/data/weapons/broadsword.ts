import type { Weapon } from "#geo/models";

export default {
    id: "broadsword",
    name: "Broadsword",
    rarity: "common",
    icon: "broadsword",
    description: "A plain, heavy blade. Slow, but it doesn't need to be fast.",
    weapon: { type: "sword", style: "melee" },
    modifiers: [{ stat: "attack", kind: "flat", value: 8 }],
    unlocksCards: ["heavy-swing"],
} satisfies Weapon;
