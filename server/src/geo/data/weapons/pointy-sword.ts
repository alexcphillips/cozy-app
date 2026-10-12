import type { Weapon } from "#geo/models";

export default {
    id: "pointy-sword",
    name: "Pointy Sword",
    rarity: "uncommon",
    icon: "pointy-sword",
    description: "Light and quick. Better at finding gaps than breaking guards.",
    weapon: { type: "sword", style: "melee" },
    modifiers: [{ stat: "attack", kind: "flat", value: 4 }],
} satisfies Weapon;
