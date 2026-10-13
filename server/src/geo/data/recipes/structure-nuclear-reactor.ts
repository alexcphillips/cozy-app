import type { Recipe } from "#geo/models";

export default {
    id: "structure-nuclear-reactor",
    inputs: [{ itemId: "golden-scarab", quantity: 2 }, { itemId: "stardust", quantity: 3 }, { itemId: "beetle-shell", quantity: 10 }],
    output: { itemId: "structure.nuclear-reactor", quantity: 1 },
} satisfies Recipe;
