/**
 * Types for the geo-game combat engine.
 *
 * Every rule is data: an item, card, status or enemy carries `EffectDef`s, and
 * the engine resolves them through one event pipeline (`effects.ts`). Adding a
 * talisman that zaps attackers, a status that skips turns, or a card that is
 * free against burning targets is a content change, not an engine change.
 *
 * Everything in a `BattleState` is plain JSON, so a Run can be stored in a
 * `jsonb` column between turns and replayed from its seed.
 */

// ---------------------------------------------------------------------------
// Stats

/**
 * Stat ids. Open-ended on purpose: a new stat is a new string used by content
 * (a modifier, a condition or an action amount), with no engine change.
 */
export type StatId = string;

/** Stats every combatant has. Anything else defaults to 0 when read. */
export const CORE_STATS = {
    maxHealth: "maxHealth",
    attack: "attack",
    defence: "defence",
    speed: "speed",
    /** 0–1. */
    critChance: "critChance",
    /** Damage multiplier on a crit, e.g. 1.5. */
    critMultiplier: "critMultiplier",
} as const;

/**
 * How much more the food you eat heals, as a fraction: a flat +0.25 from gear
 * = food heals 25% more. Only the food's own heals; 0 unless something gives it.
 */
export const FOOD_HEALING_STAT: StatId = "foodHealing";

/**
 * Extra damage this combatant deals, as a fraction: a flat +0.25 = 25% more.
 * Every element and kind (blows, spells, procs), but never damage from a
 * status (a Burning tick) or to oneself: status damage changes only through
 * rules that say so (`damageFromStatus`).
 * Combat level gives the player some (`combat/combatants.ts`).
 */
export const DAMAGE_DEALT_STAT: StatId = "damageDealt";

/**
 * More crops from every harvest: a flat +100 = 100% more (×2), so 1000 is
 * ×11. The fraction left over is a chance of one more. Not seeds.
 * See `farming/farm.ts` `withFortune`.
 */
export const FARMING_FORTUNE_STAT: StatId = "farmingFortune";

export type Stats = Record<StatId, number>;

/**
 * A change to one stat from gear, a talisman or a status. Flat modifiers add
 * first, then percent modifiers scale the total: (base + flat) × (1 + Σ%).
 */
export type StatModifier = {
    stat: StatId;
    kind: "flat" | "percent";
    /** Flat: an amount. Percent: a fraction, 0.1 = +10%. */
    value: number;
};

// ---------------------------------------------------------------------------
// Events and effects

/**
 * Points in a turn that effects can react to. `actor` is whoever caused the
 * event, `target` whoever it happened to.
 *
 * - `battleStart`: once, before the first turn.
 * - `turnStart`: actor = whoever's turn it is.
 * - `beforeAction`: actor = whoever is about to act. `cancelAction` here skips
 *   the turn (Frozen).
 * - `cardPlayed`: actor played `card` at target. Only the card's own effects
 *   and the actor's gear hear it.
 * - `foodEaten`: actor ate `food` from their lunchbox (actor = target). The
 *   food's own effects hear it too.
 * - `attacked`: an attack is about to land; actor = attacker, target = defender.
 * - `beforeDamage`: damage is being worked out; `modifyDamage` here changes it.
 * - `damageTaken`: actor dealt `amount` to target.
 * - `attackFinished`: actor's attack has fully resolved (Burning ticks here).
 * - `turnEnd`: actor's turn is over; status durations tick down.
 * - `defeated`: target has hit 0 health; actor landed the blow ("on kill").
 */
export type EventType =
    | "battleStart"
    | "turnStart"
    | "beforeAction"
    | "cardPlayed"
    | "foodEaten"
    | "attacked"
    | "beforeDamage"
    | "damageTaken"
    | "attackFinished"
    | "turnEnd"
    | "defeated";

/** The owner's part in an event, for a trigger to match on. */
export type EventRole = "actor" | "target" | "any";

/**
 * Who an action or condition refers to, from the effect owner's point of view.
 *
 * - `self`: the effect's owner.
 * - `other`: the owner's counterpart in the event — the target if the owner is
 *   the actor, the actor if the owner is the target.
 * - `actor` / `target`: the event's actor or target, whoever that is.
 */
export type Who = "self" | "other" | "actor" | "target";

export type Trigger = {
    event: EventType;
    /** Defaults to "any". */
    as?: EventRole;
};

export type Condition =
    | { type: "hasStatus"; who: Who; status: string }
    | { type: "lacksStatus"; who: Who; status: string }
    /** Current health ≤ fraction × max health. */
    | { type: "healthBelow"; who: Who; fraction: number }
    /** The card in this event carries a tag, e.g. "fire". */
    | { type: "cardHasTag"; tag: string }
    /** The food in this event carries a tag, e.g. "spicy". */
    | { type: "foodHasTag"; tag: string }
    /** The damage in this event is of an element. */
    | { type: "damageElement"; element: string }
    /**
     * The damage in this event comes from a status's own effect (a Burning
     * tick); `status` narrows it to one. For rules that change status damage,
     * like an oil that makes burns hurt more.
     */
    | { type: "damageFromStatus"; status?: string }
    | { type: "not"; condition: Condition }
    /** At least one holds. (A plain list already means "all".) */
    | { type: "any"; conditions: Condition[] };

/**
 * How big a damage, heal or guard amount is. A bare number is flat. The object
 * form is (owner's `stat` × `multiplier`) + `flat`, then × stacks when
 * `perStack` — e.g. `{ stat: "attack", multiplier: 1.2 }` for a heavy blow,
 * `{ flat: 3, perStack: true }` for a burn.
 */
export type Amount =
    | number
    | {
          stat?: StatId;
          /** Defaults to 1. Ignored without a stat. */
          multiplier?: number;
          flat?: number;
          /** Multiply by the source status's stacks (Burning). */
          perStack?: boolean;
      };

export type Action =
    /**
     * A weapon blow: fires `attacked` and `attackFinished`, can crit, is
     * reduced by defence. `delivery` is for the app's animation only.
     * `hits` (default 1) repeats the blow: each hit fires `attacked`, rolls
     * its own crit and meets defence alone; `attackFinished` fires once after
     * the last. `amount` is per hit.
     */
    | {
          type: "attack";
          to: Who;
          amount: Amount;
          hits?: number;
          element?: string;
          delivery?: "melee" | "projectile";
      }
    /**
     * Damage that isn't an attack (lightning from a talisman, a burn): no
     * `attacked` event, so procs can't loop off each other, no crit.
     */
    | { type: "damage"; to: Who; amount: Amount; element?: string; ignoreDefence?: boolean }
    | { type: "heal"; to: Who; amount: Amount }
    /** Absorbs the next hits until used up. */
    | { type: "guard"; to: Who; amount: Amount }
    | {
          type: "applyStatus";
          to: Who;
          status: string;
          stacks?: number;
          /** Overrides the status's own duration, in the bearer's turns. */
          duration?: number;
      }
    | { type: "removeStatus"; from: Who; status: string }
    /** In `beforeAction`: the actor's turn is skipped. */
    | { type: "cancelAction" }
    /** In `cardPlayed`: the card costs no charge this time. */
    | { type: "freeCharge" }
    /** In `beforeDamage`: (amount + add) × multiply. */
    | { type: "modifyDamage"; add?: number; multiply?: number };

export type EffectDef = {
    /** For logs and debugging, e.g. "storm-charm.lightning". */
    id: string;
    trigger: Trigger;
    /** All must hold. */
    conditions?: Condition[];
    /** 0–1, rolled after conditions pass. Defaults to 1. */
    chance?: number;
    actions: Action[];
};

// ---------------------------------------------------------------------------
// Content definitions

export type StatusDef = {
    id: string;
    name: string;
    /** Default duration in the bearer's turns; omitted = until removed. */
    duration?: number;
    /** Reapplying adds stacks up to this; 1 = refreshes instead. */
    maxStacks: number;
    modifiers?: StatModifier[];
    effects?: EffectDef[];
};

export type CardDef = {
    id: string;
    name: string;
    skill: string;
    /** e.g. "fire", for conditions like "free if the target is Burning". */
    tags?: string[];
    /** Who the card is aimed at. */
    targets: "enemy" | "self";
    /** What playing it does, in order. */
    actions: Action[];
    /** Card-only rules, heard only when this card is played. */
    effects?: EffectDef[];
    /**
     * Weapon tags, any one of which the player's weapon must carry to play
     * this, e.g. ["dagger"] or ["melee"]. Omitted = playable with anything.
     */
    requiresWeapon?: string[];
};

/**
 * Food eaten from the lunchbox. Its id is the item's id: food is a consumable
 * item with these rules (`data/food/`). Eating takes the turn.
 */
export type FoodDef = {
    id: string;
    name: string;
    /** e.g. "spicy", for conditions like "spicy food heals more". */
    tags?: string[];
    /** What eating it does to the eater (`self`), in order. */
    actions: Action[];
    /** Food-only rules, heard only when this food is eaten. */
    effects?: EffectDef[];
};

/** What an enemy might do on its turn. Picked by weight. */
export type EnemyMove = {
    id: string;
    name: string;
    weight: number;
    actions: Action[];
};

// ---------------------------------------------------------------------------
// Battle state (plain JSON)

export type StatusInstance = {
    statusId: string;
    stacks: number;
    /** Bearer turns left; null = until removed. */
    turnsLeft: number | null;
};

export type CardInstance = {
    /** The player's inventory row this copy came from. */
    instanceId: string;
    cardId: string;
    chargesLeft: number;
};

/** One lunchbox slot: a stack of one food. */
export type LunchboxSlot = {
    /** 0-based slot index, as stored. */
    slot: number;
    foodId: string;
    quantity: number;
};

export type Combatant = {
    id: string;
    side: "player" | "enemy";
    name: string;
    baseStats: Stats;
    /** From gear and talismans; fixed for the battle. */
    modifiers: StatModifier[];
    /** From gear, talismans and enemy traits; fixed for the battle. */
    effects: EffectDef[];
    health: number;
    guard: number;
    statuses: StatusInstance[];
    /** Enemies only. */
    moves?: EnemyMove[];
    /** Players only. */
    hand?: CardInstance[];
    /** Players only: food packed for this Run. */
    lunchbox?: LunchboxSlot[];
    /** Players only: the wielded weapon's tags, e.g. ["dagger", "melee"]. */
    weaponTags?: string[];
};

export type BattleState = {
    seed: number;
    /** How many numbers the RNG has drawn, so a resumed battle continues it. */
    rngDraws: number;
    round: number;
    /** Combatant ids in acting order for this round. */
    order: string[];
    /** Index into `order` of whoever acts next. */
    turnIndex: number;
    combatants: Combatant[];
    outcome: "ongoing" | "victory" | "defeat";
};

// ---------------------------------------------------------------------------
// The turn log: what the app animates, in order. Defined in the shared
// contract so the app and server agree on it.

export type { GeoLogEntry as LogEntry } from "@cozy/shared/geo";
