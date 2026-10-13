import type { Recipe } from "#geo/models";

export default {
    id: "structure-lightning-rod",
    inputs: [{ itemId: "golden-scarab", quantity: 1 }, { itemId: "beetle-shell", quantity: 6 }, { itemId: "corn", quantity: 10 }],
    output: { itemId: "structure.lightning-rod", quantity: 1 },
} satisfies Recipe;
