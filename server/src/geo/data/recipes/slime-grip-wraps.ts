import type { Recipe } from "#geo/models";

// PLACEHOLDER amounts, until a balance pass.
export default {
    id: "slime-grip-wraps",
    inputs: [{ itemId: "slime", quantity: 10 }, { itemId: "silk-spool", quantity: 4 }],
    output: { itemId: "slime-grip-wraps", quantity: 1 },
    skills: [{ skill: "combat", level: 3 }],
} satisfies Recipe;
