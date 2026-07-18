export type EffectTrigger =
    | { type: "onTick" }
    | { type: "onAction" }
    | { type: "onEnemyAction" }
    | { type: "onCondition"; conditionId: string }
    | { type: "onApply" }
    | { type: "onExpire" }
    | { type: "onEvent"; event: string };
