import type { Recipe } from "#geo/models";

export default {
    id: "bone-meal-blend",
    inputs: [{ itemId: "worm-castings", quantity: 4 }, { itemId: "mouse-tail", quantity: 3 }, { itemId: "beetle-shell", quantity: 2 }],
    output: { itemId: "bone-meal-blend", quantity: 1 },
} satisfies Recipe;
