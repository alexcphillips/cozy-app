import type { Gear } from "../../../models/gear/gear.model";

export const trainingSword: Gear = {
    itemType: "gear",
    slot: "mainHand",
    system: "item",
    baseValue: 10,
    id: "training_sword",
    name: "Training Sword",
    description: "PLACEHOLDER",
    tags: [""],
} as const;
