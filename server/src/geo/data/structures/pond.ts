import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "pond",
    name: "Pond",
    rarity: "uncommon",
    icon: "lily-pads",
    description: "A little water and one very hungry frog.",
    stats: [{ label: "Water and frog", value: "Keeps the 4 tiles beside it at 1 water or more. Its frog eats 1 pest on or around it each cycle" }],
    effect: { kind: "pond" },
} satisfies Structure;
