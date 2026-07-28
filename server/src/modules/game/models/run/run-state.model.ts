import type { ActiveEffect } from "../effects/active-effect.model";

export interface RunState {
    rngSeed: number;
    tick: number;
    // stats: {};
    activeEffects: ActiveEffect[];
    inventory: string[]; // item IDs
    deck?: string[]; // card IDs
    flags: Record<string, boolean>;
}
