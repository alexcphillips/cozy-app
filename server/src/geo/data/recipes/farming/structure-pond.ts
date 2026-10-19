import type { Recipe } from "#geo/models";

export default {
    id: "structure-pond",
    inputs: [{ itemId: "melon", quantity: 4 }, { itemId: "worm-castings", quantity: 3 }],
    output: { itemId: "structure.pond", quantity: 1 },
} satisfies Recipe;
