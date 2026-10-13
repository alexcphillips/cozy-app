import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "jukebox",
    name: "Jukebox",
    rarity: "rare",
    icon: "musical-notes",
    description: "It only knows pest songs. They come when they hear their own.",
    stats: [{ label: "Tune", value: "Pick a pest: it's 3× likelier to be the one that comes" }],
    effect: { kind: "jukebox", boost: 3 },
} satisfies Structure;
