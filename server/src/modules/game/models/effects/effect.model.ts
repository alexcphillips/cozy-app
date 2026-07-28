import type { BaseContent } from "../base-content.model";

export interface Effect extends BaseContent {
    system: "effect";
    effectType: "buff" | "debuff";
    modifiers: {
        stat?: string;
        multiplier?: number;
        flat?: number;
    };
    duration?: number;
}
