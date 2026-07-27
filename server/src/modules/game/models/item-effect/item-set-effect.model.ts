import type { ItemSetEffectBonus } from "./item-set-effect-bonus.model";

export interface ItemSetEffect {
    id: string;
    bonuses: ItemSetEffectBonus[];
}
