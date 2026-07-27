import type { ItemEffect } from "./item-effect.model";

export interface ItemSetEffectBonus {
    piecesRequirement: number;
    effects: ItemEffect[];
}
