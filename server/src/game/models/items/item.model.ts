import type { BaseContent } from "../base-content.model";
import type { ItemType } from "./item-type.model";

export interface Item extends BaseContent {
    system: "item";
    itemType: ItemType;
    baseValue: number;
}
