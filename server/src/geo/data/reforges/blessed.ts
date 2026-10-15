import type { Reforge } from "#geo/models";

// Mending: heal a little at the start of each of your turns.
export default {
    id: "blessed",
    name: "Blessed",
    appliesTo: ["armour"],
    modifiers: {
        common: [{ stat: "mending", kind: "flat", value: 1 }],
        uncommon: [{ stat: "mending", kind: "flat", value: 1 }],
        rare: [{ stat: "mending", kind: "flat", value: 2 }],
        epic: [{ stat: "mending", kind: "flat", value: 3 }],
        legendary: [{ stat: "mending", kind: "flat", value: 4 }],
    },
} satisfies Reforge;
