import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "mysterious-shrine",
    name: "Mysterious Shrine",
    rarity: "rare",
    icon: "stone-tablet",
    description: "Old stone that wants something. It doesn't say what it gives back.",
    stats: [{ label: "Shrine", value: "Offer items: the more they're worth, the better the odds of a blessing. Sometimes it curses instead" }],
    effect: { kind: "shrine" },
} satisfies Structure;
