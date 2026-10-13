import type { Recipe } from "#geo/models";

export default {
    id: "structure-jukebox",
    inputs: [{ itemId: "golden-scarab", quantity: 1 }, { itemId: "beetle-shell", quantity: 4 }, { itemId: "mouse-tail", quantity: 4 }],
    output: { itemId: "structure.jukebox", quantity: 1 },
} satisfies Recipe;
