import type { Reforge } from "#geo/models";

// More defence, a little slower.
export default {
    id: "heavy",
    name: "Heavy",
    appliesTo: ["armour"],
    modifiers: {
        common: [{ stat: "defence", kind: "flat", value: 2 }, { stat: "speed", kind: "flat", value: -1 }],
        uncommon: [{ stat: "defence", kind: "flat", value: 3 }, { stat: "speed", kind: "flat", value: -1 }],
        rare: [{ stat: "defence", kind: "flat", value: 5 }, { stat: "speed", kind: "flat", value: -2 }],
        epic: [{ stat: "defence", kind: "flat", value: 7 }, { stat: "speed", kind: "flat", value: -2 }],
        legendary: [{ stat: "defence", kind: "flat", value: 10 }, { stat: "speed", kind: "flat", value: -3 }],
    },
} satisfies Reforge;
