import type { ActiveEffectSource } from "./active-effect-source.model";
import type { EffectTrigger } from "./effect-trigger.model";

export interface ActiveEffect {
    id: string;
    source: {
        type: ActiveEffectSource;
        refId: string;
    };
    trigger: EffectTrigger;
    duration?: number; // in ticks, or undefined = infinite
    stacks?: number;
    params?: Record<string, number | string | boolean>;
    priority?: number;
}
