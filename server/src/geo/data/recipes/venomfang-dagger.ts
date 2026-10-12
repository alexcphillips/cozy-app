import type { Recipe } from "#geo/models";

export default {
    id: "venomfang-dagger",
    inputs: [{ itemId: "silk-spool", quantity: 6 }, { itemId: "spider-fang", quantity: 1 }],
    output: { itemId: "venomfang-dagger", quantity: 1 },
    skills: [{ skill: "combat", level: 5 }],
} satisfies Recipe;
