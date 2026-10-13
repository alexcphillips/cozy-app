import type { Recipe } from "#geo/models";

export default {
    id: "structure-compost-bin",
    inputs: [{ itemId: "wheat", quantity: 10 }, { itemId: "worm-castings", quantity: 5 }],
    output: { itemId: "structure.compost-bin", quantity: 1 },
} satisfies Recipe;
