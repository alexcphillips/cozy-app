import type { Recipe } from "#geo/models";

export default {
    id: "structure-greenhouse",
    inputs: [{ itemId: "wheat", quantity: 20 }, { itemId: "beetle-shell", quantity: 8 }, { itemId: "pumpkin", quantity: 4 }],
    output: { itemId: "structure.greenhouse", quantity: 1 },
} satisfies Recipe;
