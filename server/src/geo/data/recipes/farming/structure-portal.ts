import type { Recipe } from "#geo/models";

export default {
    id: "structure-portal",
    inputs: [{ itemId: "stardust", quantity: 2 }, { itemId: "mite-dust", quantity: 10 }, { itemId: "isotope", quantity: 2 }],
    output: { itemId: "structure.portal", quantity: 1 },
} satisfies Recipe;
