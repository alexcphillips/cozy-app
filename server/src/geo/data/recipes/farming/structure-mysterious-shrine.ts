import type { Recipe } from "#geo/models";

export default {
    id: "structure-mysterious-shrine",
    inputs: [{ itemId: "golden-scarab", quantity: 1 }, { itemId: "wheat", quantity: 20 }, { itemId: "worm-castings", quantity: 5 }],
    output: { itemId: "structure.mysterious-shrine", quantity: 1 },
} satisfies Recipe;
