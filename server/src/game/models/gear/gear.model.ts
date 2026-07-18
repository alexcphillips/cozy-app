import type { ItemEffect } from "../item-effect/item-effect.model";
import type { SlotType } from "../slot-type.model";
import type { StatMap } from "../stats/stat-map.model";
import type { Item } from "../items/item.model";

export interface Gear extends Item {
    itemType: "gear";
    slot: SlotType;
    stats?: StatMap;
    effects?: ItemEffect[];
    setId?: string;
}
