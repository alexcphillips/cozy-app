import type { Recipe } from "#geo/models";

export default {
    id: "structure-well",
    inputs: [{ itemId: "potato", quantity: 10 }, { itemId: "worm-castings", quantity: 3 }, { itemId: "beetle-shell", quantity: 4 }],
    output: { itemId: "structure.well", quantity: 1 },
} satisfies Recipe;
