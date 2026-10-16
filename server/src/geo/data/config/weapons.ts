import type { WeaponsConfig } from "#geo/models";

export default {
    types: ["dagger", "sword", "fists"],
    styles: ["melee"],
    // No weapon equipped: punch. One less attack than the Bronze Dagger.
    unarmed: { type: "fists", style: "melee", modifiers: [{ stat: "attack", kind: "flat", value: 1 }] },
} satisfies WeaponsConfig;
