import type { Card } from "#geo/models";

export default {
    id: "farm.bucket-line",
    name: "Bucket Line",
    rarity: "common",
    icon: "watering-can",
    description: "Pass the buckets down the row.",
    stats: [
        { label: "Role", value: "Water" },
        { label: "Does", value: "1 Labor. +1 moisture on every tile in the row." },
    ],
    skill: "farming",
    maxCharges: 60,
    targets: "self",
} satisfies Card;
