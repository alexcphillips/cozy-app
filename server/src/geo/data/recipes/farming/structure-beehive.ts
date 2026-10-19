import type { Recipe } from "#geo/models";

export default {
    id: "structure-beehive",
    inputs: [{ itemId: "wheat", quantity: 15 }, { itemId: "mite-dust", quantity: 5 }],
    output: { itemId: "structure.beehive", quantity: 1 },
} satisfies Recipe;
