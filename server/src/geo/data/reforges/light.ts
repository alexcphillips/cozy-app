import type { Reforge } from "#geo/models";

// Quicker on your feet, a little less defence.
export default {
    id: "light",
    name: "Light",
    appliesTo: ["armour"],
    modifiers: {
        common: [{ stat: "speed", kind: "flat", value: 1 }, { stat: "defence", kind: "flat", value: -1 }],
        uncommon: [{ stat: "speed", kind: "flat", value: 2 }, { stat: "defence", kind: "flat", value: -1 }],
        rare: [{ stat: "speed", kind: "flat", value: 3 }, { stat: "defence", kind: "flat", value: -2 }],
        epic: [{ stat: "speed", kind: "flat", value: 4 }, { stat: "defence", kind: "flat", value: -2 }],
        legendary: [{ stat: "speed", kind: "flat", value: 5 }, { stat: "defence", kind: "flat", value: -3 }],
    },
} satisfies Reforge;
