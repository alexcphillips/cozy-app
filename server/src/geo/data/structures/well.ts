import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "well",
    name: "Well",
    rarity: "uncommon",
    icon: "well",
    description: "Cold water a bucket's drop away, as long as the sky keeps filling it.",
    stats: [{ label: "Water", value: "Holds up to 10. Rain +3, Storm +5, Heatwave −2. Watering draws on it for no Labor" }],
    effect: { kind: "well", capacity: 10, rain: 3, storm: 5, heatwave: 2 },
} satisfies Structure;
