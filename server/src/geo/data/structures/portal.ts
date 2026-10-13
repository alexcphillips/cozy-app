import type { Structure } from "#geo/models";

// PLACEHOLDER numbers.
export default {
    id: "portal",
    name: "Portal",
    rarity: "epic",
    icon: "portal",
    description: "A door that wasn't there yesterday. Something knocks back.",
    stats: [{ label: "Portal", value: "Tear the Veil opens it: 2 elite pests come through on the next Advance. Hard to clear, rich drops" }],
    effect: { kind: "portal", wave: 2, pests: ["rift-locust", "shade-rat"] },
} satisfies Structure;
