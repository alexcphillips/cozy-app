import type { Card } from "#geo/models";

export default {
    id: "farm.coax",
    name: "Coax",
    rarity: "rare",
    icon: "sprout",
    description: "Whisper to the soil and see what answers.",
    stats: [
        { label: "Role", value: "Breed" },
        { label: "Does", value: "2 Labor. An empty tile rolls the mutations whose recipes hold there right now, at half their chance. A miss costs it 2 fertility." },
    ],
    skill: "farming",
    maxCharges: 15,
    targets: "self",
} satisfies Card;
