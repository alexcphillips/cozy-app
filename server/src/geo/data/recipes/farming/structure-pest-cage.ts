import type { Recipe } from "#geo/models";

export default {
    id: "structure-pest-cage",
    inputs: [{ itemId: "beetle-shell", quantity: 6 }, { itemId: "wheat", quantity: 5 }],
    output: { itemId: "structure.pest-cage", quantity: 1 },
} satisfies Recipe;
