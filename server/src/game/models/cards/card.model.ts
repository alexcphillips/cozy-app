import type { BaseContent } from "../base-content.model";
import type { CardEffect } from "./card-effect.model";

export interface Card extends BaseContent {
    system: "card";
    cost?: number; // mana or currency
    uses?: number; // 0 uses = it breaks
    cooldown?: number;
    effects: CardEffect[];
}
