import type { Dungeon } from "#geo/models";

// PLACEHOLDER: a stand-in until dungeons get their own bosses.
export default {
    id: "slime-pits",
    name: "Slime Pits",
    description: "Something huge and acidic has settled at the bottom of the pits.",
    boss: "acid-slime",
    bossModifiers: [
        { stat: "maxHealth", kind: "percent", value: 2 },
        { stat: "attack", kind: "percent", value: 0.25 },
    ],
    requiredLevel: 0,
    maxPlayers: 4,
} satisfies Dungeon;
