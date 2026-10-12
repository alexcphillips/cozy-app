import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BattleRuleError, createBattle, eatFood, playCard, type CombatantSetup } from "./battle";
import type { EngineContent } from "./content.types";
import type { CardDef, EffectDef, FoodDef, LogEntry, StatusDef } from "./engine.types";

/*
 * Engine tests against small hand-made content, so each rule is checked on
 * its own and with chances pinned to 0 or 1. Run with `npm run test:geo`.
 */

const BURNING: StatusDef = {
    id: "burning",
    name: "Burning",
    duration: 3,
    maxStacks: 5,
    effects: [
        {
            id: "burning.tick",
            trigger: { event: "attackFinished", as: "actor" },
            actions: [{ type: "damage", to: "self", amount: { flat: 3, perStack: true }, element: "fire", ignoreDefence: true }],
        },
    ],
};

const frozen = (thawChance: number): StatusDef => ({
    id: "frozen",
    name: "Frozen",
    duration: 3,
    maxStacks: 1,
    effects: [
        {
            id: "frozen.thaw",
            trigger: { event: "turnStart", as: "actor" },
            chance: thawChance,
            actions: [{ type: "removeStatus", from: "self", status: "frozen" }],
        },
        { id: "frozen.skip", trigger: { event: "beforeAction", as: "actor" }, actions: [{ type: "cancelAction" }] },
    ],
});

const CARDS: Record<string, CardDef> = {
    slash: {
        id: "slash",
        name: "Slash",
        skill: "combat",
        targets: "enemy",
        actions: [{ type: "attack", to: "other", amount: { stat: "attack" } }],
    },
    flurry: {
        id: "flurry",
        name: "Flurry",
        skill: "combat",
        targets: "enemy",
        actions: [{ type: "attack", to: "other", amount: { stat: "attack", multiplier: 0.6 }, hits: 2 }],
    },
    fireball: {
        id: "fireball",
        name: "Fireball",
        skill: "combat",
        tags: ["fire"],
        targets: "enemy",
        actions: [
            { type: "attack", to: "other", amount: 5, element: "fire" },
            { type: "applyStatus", to: "other", status: "burning" },
        ],
        effects: [
            {
                id: "fireball.free",
                trigger: { event: "cardPlayed", as: "actor" },
                conditions: [{ type: "hasStatus", who: "target", status: "burning" }],
                actions: [{ type: "freeCharge" }],
            },
        ],
    },
    freeze: {
        id: "freeze",
        name: "Freeze",
        skill: "combat",
        targets: "enemy",
        actions: [{ type: "applyStatus", to: "other", status: "frozen" }],
    },
    stab: {
        id: "stab",
        name: "Stab",
        skill: "combat",
        targets: "enemy",
        requiresWeapon: ["dagger"],
        actions: [{ type: "attack", to: "other", amount: { stat: "attack" } }],
    },
    brace: {
        id: "brace",
        name: "Brace",
        skill: "combat",
        targets: "self",
        actions: [{ type: "guard", to: "self", amount: 8 }],
    },
};

const WELL_FED: StatusDef = {
    id: "well-fed",
    name: "Well Fed",
    duration: 4,
    maxStacks: 1,
    effects: [{ id: "well-fed.regen", trigger: { event: "turnStart", as: "actor" }, actions: [{ type: "heal", to: "self", amount: 8 }] }],
};

const FOODS: Record<string, FoodDef> = {
    bread: { id: "bread", name: "Bread", actions: [{ type: "heal", to: "self", amount: 15 }] },
    stew: {
        id: "stew",
        name: "Stew",
        tags: ["hearty"],
        actions: [
            { type: "heal", to: "self", amount: 10 },
            { type: "applyStatus", to: "self", status: "well-fed" },
        ],
    },
    ramen: { id: "ramen", name: "Ramen", tags: ["spicy"], actions: [{ type: "heal", to: "self", amount: 20 }] },
};

const content = (thawChance = 0.5): EngineContent => ({
    statuses: { burning: BURNING, frozen: frozen(thawChance), "well-fed": WELL_FED },
    cards: CARDS,
    foods: FOODS,
});

const hand = (...cardIds: string[]) =>
    cardIds.map((cardId, i) => ({ instanceId: `c${i}`, cardId, chargesLeft: 3 }));

function player(overrides: Partial<CombatantSetup> = {}): CombatantSetup {
    return {
        id: "player",
        side: "player",
        name: "You",
        baseStats: { maxHealth: 100, attack: 10, defence: 0, speed: 10 },
        modifiers: [],
        effects: [],
        hand: hand("slash", "fireball", "freeze", "brace"),
        ...overrides,
    };
}

function spider(overrides: Partial<CombatantSetup> = {}): CombatantSetup {
    return {
        id: "enemy:0",
        side: "enemy",
        name: "Spider",
        baseStats: { maxHealth: 40, attack: 12, defence: 0, speed: 12 },
        modifiers: [],
        effects: [],
        moves: [{ id: "bite", name: "Bite", weight: 1, actions: [{ type: "attack", to: "other", amount: { stat: "attack" } }] }],
        ...overrides,
    };
}

const healthOf = (state: { combatants: { id: string; health: number }[] }, id: string) =>
    state.combatants.find((c) => c.id === id)!.health;

const damageTo = (log: LogEntry[], target: string) =>
    log.filter((e): e is Extract<LogEntry, { type: "damage" }> => e.type === "damage" && e.target === target);

describe("turn order", () => {
    it("lets the faster enemy act before the player's first decision", () => {
        const { state, log } = createBattle([player(), spider()], 1, content());
        assert.deepEqual(state.order, ["enemy:0", "player"]);
        assert.equal(healthOf(state, "player"), 88);
        assert.equal(log.find((e) => e.type === "enemyMove")?.type, "enemyMove");
    });

    it("gives ties to the player", () => {
        const { state } = createBattle([player(), spider({ baseStats: { maxHealth: 40, attack: 12, speed: 10 } })], 1, content());
        assert.deepEqual(state.order, ["player", "enemy:0"]);
    });
});

describe("cards and charges", () => {
    it("deals attack damage and spends a charge", () => {
        const start = createBattle([player(), spider()], 1, content());
        const { state } = playCard(start.state, content(), { cardInstanceId: "c0" });
        assert.equal(healthOf(state, "enemy:0"), 30);
        assert.equal(state.combatants[0]!.hand![0]!.chargesLeft, 2);
    });

    it("rejects an illegal play and leaves the state unchanged", () => {
        const start = createBattle([player({ hand: [{ instanceId: "c0", cardId: "slash", chargesLeft: 0 }] }), spider()], 1, content());
        const before = JSON.stringify(start.state);
        assert.throws(() => playCard(start.state, content(), { cardInstanceId: "c0" }), BattleRuleError);
        assert.throws(() => playCard(start.state, content(), { cardInstanceId: "nope" }), BattleRuleError);
        assert.equal(JSON.stringify(start.state), before);
    });

    it("plays a fire card free into a burning target", () => {
        const start = createBattle([player(), spider({ baseStats: { maxHealth: 200, attack: 1, speed: 1 } })], 1, content());
        const first = playCard(start.state, content(), { cardInstanceId: "c1" });
        const second = playCard(first.state, content(), { cardInstanceId: "c1" });
        const plays = [...first.log, ...second.log].filter((e) => e.type === "cardPlayed");
        assert.deepEqual(plays.map((p) => p.type === "cardPlayed" && p.chargeSpent), [true, false]);
        assert.equal(second.state.combatants[0]!.hand![1]!.chargesLeft, 2);
    });

    it("plays a weapon card only with a weapon that carries one of its tags", () => {
        const withWeapon = (weaponTags?: string[]) =>
            createBattle([player({ hand: hand("stab"), weaponTags }), spider()], 1, content()).state;
        for (const tags of [undefined, ["sword", "melee"]]) {
            const state = withWeapon(tags);
            const before = JSON.stringify(state);
            assert.throws(() => playCard(state, content(), { cardInstanceId: "c0" }), /needs a dagger weapon/);
            assert.equal(JSON.stringify(state), before);
        }
        const { state } = playCard(withWeapon(["dagger", "melee"]), content(), { cardInstanceId: "c0" });
        assert.equal(healthOf(state, "enemy:0"), 30);
    });
});

describe("statuses", () => {
    it("burns a burning enemy after it attacks", () => {
        const start = createBattle([player({ baseStats: { maxHealth: 100, attack: 10, speed: 20 } }), spider()], 1, content());
        const { state, log } = playCard(start.state, content(), { cardInstanceId: "c1" });
        const burns = damageTo(log, "enemy:0").filter((d) => d.effectId === "burning.tick");
        assert.equal(burns.length, 1);
        assert.equal(burns[0]!.amount, 3);
        // 40 − fireball 5 − burn 3
        assert.equal(healthOf(state, "enemy:0"), 32);
    });

    it("skips a frozen enemy's turn when it fails to thaw", () => {
        const c = content(0);
        const start = createBattle([player({ baseStats: { maxHealth: 100, attack: 10, speed: 20 } }), spider()], 1, c);
        const { state, log } = playCard(start.state, c, { cardInstanceId: "c2" });
        assert.ok(log.some((e) => e.type === "turnSkipped" && e.actor === "enemy:0"));
        assert.equal(healthOf(state, "player"), 100);
    });

    it("lets a frozen enemy act once it thaws", () => {
        const c = content(1);
        const start = createBattle([player({ baseStats: { maxHealth: 100, attack: 10, speed: 20 } }), spider()], 1, c);
        const { state, log } = playCard(start.state, c, { cardInstanceId: "c2" });
        assert.ok(log.some((e) => e.type === "statusRemoved" && e.statusId === "frozen"));
        assert.equal(healthOf(state, "player"), 88);
    });
});

describe("gear and talisman effects", () => {
    const lightning = (chance: number): EffectDef => ({
        id: "storm.lightning",
        trigger: { event: "attacked", as: "target" },
        chance,
        actions: [{ type: "damage", to: "other", amount: 10, element: "lightning", ignoreDefence: true }],
    });

    it("strikes an attacker with lightning when the proc lands", () => {
        const { state, log } = createBattle([player({ effects: [lightning(1)] }), spider()], 1, content());
        assert.equal(damageTo(log, "enemy:0")[0]?.element, "lightning");
        assert.equal(healthOf(state, "enemy:0"), 30);
    });

    it("does nothing when the proc misses", () => {
        const { state } = createBattle([player({ effects: [lightning(0)] }), spider()], 1, content());
        assert.equal(healthOf(state, "enemy:0"), 40);
    });

    it("applies stat modifiers from gear", () => {
        const geared = player({ modifiers: [{ stat: "attack", kind: "flat", value: 5 }, { stat: "attack", kind: "percent", value: 0.2 }] });
        const start = createBattle([geared, spider()], 1, content());
        const { state } = playCard(start.state, content(), { cardInstanceId: "c0" });
        // (10 + 5) × 1.2 = 18
        assert.equal(healthOf(state, "enemy:0"), 22);
    });

    it("stops effects that trigger each other", () => {
        const thorns: EffectDef = {
            id: "thorns",
            trigger: { event: "damageTaken", as: "target" },
            actions: [{ type: "damage", to: "other", amount: 1, ignoreDefence: true }],
        };
        const big = { maxHealth: 10_000, attack: 1, speed: 1 };
        const start = createBattle(
            [player({ effects: [thorns], baseStats: { ...big, speed: 20 } }), spider({ effects: [thorns], baseStats: big })],
            1,
            content(),
        );
        const { log } = playCard(start.state, content(), { cardInstanceId: "c0" });
        assert.ok(log.length < 200, `log grew to ${log.length}`);
    });
});

describe("guard", () => {
    it("absorbs the next hit", () => {
        const start = createBattle([player({ baseStats: { maxHealth: 100, attack: 10, speed: 20 } }), spider()], 1, content());
        const { state, log } = playCard(start.state, content(), { cardInstanceId: "c3" });
        assert.equal(damageTo(log, "player")[0]?.blocked, 8);
        assert.equal(healthOf(state, "player"), 96);
    });
});

describe("multi-hit attacks", () => {
    const fast = (overrides: Partial<CombatantSetup> = {}) =>
        player({ baseStats: { maxHealth: 100, attack: 10, defence: 0, speed: 20 }, hand: hand("flurry"), ...overrides });

    it("lands each hit separately, each meeting defence alone", () => {
        const start = createBattle([fast(), spider({ baseStats: { maxHealth: 40, attack: 12, defence: 2, speed: 12 } })], 1, content());
        const { state, log } = playCard(start.state, content(), { cardInstanceId: "c0" });
        assert.deepEqual(damageTo(log, "enemy:0").map((d) => d.amount), [4, 4]);
        // 40 − 2 × (6 − 2)
        assert.equal(healthOf(state, "enemy:0"), 32);
    });

    it("fires on-attacked procs once per hit", () => {
        const zap: EffectDef = {
            id: "zap",
            trigger: { event: "attacked", as: "target" },
            actions: [{ type: "damage", to: "other", amount: 1, ignoreDefence: true }],
        };
        const start = createBattle([fast(), spider({ effects: [zap] })], 1, content());
        const { log } = playCard(start.state, content(), { cardInstanceId: "c0" });
        assert.equal(damageTo(log, "player").filter((d) => d.effectId === "zap").length, 2);
    });

    it("fires attackFinished once, after the last hit", () => {
        const after: EffectDef = {
            id: "after",
            trigger: { event: "attackFinished", as: "actor" },
            actions: [{ type: "damage", to: "other", amount: 1, ignoreDefence: true }],
        };
        const start = createBattle([fast({ effects: [after] }), spider()], 1, content());
        const { log } = playCard(start.state, content(), { cardInstanceId: "c0" });
        const enemyHits = damageTo(log, "enemy:0");
        assert.deepEqual(enemyHits.map((d) => d.effectId ?? "hit"), ["hit", "hit", "after"]);
    });

    it("stops early once the target is dead", () => {
        const start = createBattle([fast(), spider({ baseStats: { maxHealth: 5, attack: 12, speed: 12 } })], 1, content());
        const { state, log } = playCard(start.state, content(), { cardInstanceId: "c0" });
        assert.equal(damageTo(log, "enemy:0").length, 1);
        assert.equal(state.outcome, "victory");
    });
});

describe("battle end and determinism", () => {
    it("ends in victory when the last enemy falls", () => {
        const start = createBattle([player({ baseStats: { maxHealth: 100, attack: 50, speed: 20 } }), spider()], 1, content());
        const { state, log } = playCard(start.state, content(), { cardInstanceId: "c0" });
        assert.equal(state.outcome, "victory");
        assert.deepEqual(log.at(-1), { type: "battleEnd", outcome: "victory" });
        assert.throws(() => playCard(state, content(), { cardInstanceId: "c0" }), BattleRuleError);
    });

    it("replays identically from the same seed", () => {
        const run = (seed: number) => {
            let result = createBattle([player({ effects: [] }), spider()], seed, content());
            const logs = [...result.log];
            for (let i = 0; i < 3 && result.state.outcome === "ongoing"; i++) {
                result = playCard(result.state, content(), { cardInstanceId: "c2" });
                logs.push(...result.log);
            }
            return JSON.stringify(logs);
        };
        assert.equal(run(42), run(42));
    });
});

describe("condition combinators and on-kill", () => {
    it("supports not and any", () => {
        const notFrozen: EffectDef = {
            id: "rage",
            trigger: { event: "attacked", as: "target" },
            conditions: [
                { type: "not", condition: { type: "hasStatus", who: "self", status: "frozen" } },
                { type: "any", conditions: [{ type: "healthBelow", who: "self", fraction: 0.1 }, { type: "lacksStatus", who: "other", status: "burning" }] },
            ],
            actions: [{ type: "damage", to: "other", amount: 2, ignoreDefence: true }],
        };
        const { state } = createBattle([player({ effects: [notFrozen] }), spider()], 1, content());
        assert.equal(healthOf(state, "enemy:0"), 38);
    });

    it("tells on-kill effects who landed the blow", () => {
        const onKill: EffectDef = {
            id: "victory-heal",
            trigger: { event: "defeated", as: "actor" },
            actions: [{ type: "heal", to: "self", amount: 5 }],
        };
        const start = createBattle([player({ effects: [onKill], baseStats: { maxHealth: 100, attack: 50, speed: 1 } }), spider()], 1, content());
        const { log } = playCard(start.state, content(), { cardInstanceId: "c0" });
        assert.ok(log.some((e) => e.type === "proc" && e.effectId === "victory-heal"));
    });
});

describe("eating from the lunchbox", () => {
    /** A spider too slow and weak to matter, so only the food moves health. */
    const harmless = () => spider({ baseStats: { maxHealth: 40, attack: 0, speed: 1 } });
    const lunchbox = () => [
        { slot: 0, foodId: "bread", quantity: 2 },
        { slot: 1, foodId: "stew", quantity: 1 },
        { slot: 2, foodId: "ramen", quantity: 1 },
    ];
    const heals = (log: LogEntry[]) =>
        log.filter((e): e is Extract<LogEntry, { type: "heal" }> => e.type === "heal").map((e) => e.amount);

    it("heals, uses one from the slot and takes the turn", () => {
        const start = createBattle([player({ health: 50, lunchbox: lunchbox() }), harmless()], 1, content());
        const { state, log } = eatFood(start.state, content(), { slot: 0 });
        assert.equal(healthOf(state, "player"), 65);
        assert.equal(state.combatants[0]!.lunchbox![0]!.quantity, 1);
        assert.deepEqual(log.find((e) => e.type === "foodEaten"), { type: "foodEaten", actor: "player", foodId: "bread", slot: 0 });
        // The turn passed: the enemy moved before the player's next decision.
        assert.ok(log.some((e) => e.type === "enemyMove"));
    });

    it("never heals past max health", () => {
        const start = createBattle([player({ health: 95, lunchbox: lunchbox() }), harmless()], 1, content());
        const { state, log } = eatFood(start.state, content(), { slot: 0 });
        assert.equal(healthOf(state, "player"), 100);
        assert.deepEqual(heals(log), [5]);
    });

    it("rejects an empty or missing slot and leaves the state unchanged", () => {
        const start = createBattle(
            [player({ lunchbox: [{ slot: 0, foodId: "bread", quantity: 0 }] }), harmless()],
            1,
            content(),
        );
        const before = JSON.stringify(start.state);
        assert.throws(() => eatFood(start.state, content(), { slot: 0 }), BattleRuleError);
        assert.throws(() => eatFood(start.state, content(), { slot: 3 }), BattleRuleError);
        assert.equal(JSON.stringify(start.state), before);
    });

    it("can apply statuses: a stew heals now, then on each of the next 3 turns", () => {
        const start = createBattle([player({ health: 40, lunchbox: lunchbox() }), harmless()], 1, content());
        let { state, log } = eatFood(start.state, content(), { slot: 1 });
        const all = [...log];
        // The next turn's first tick lands before the player decides, so it's
        // in the eating turn's log; two more turns hold the other two, and a
        // third holds none.
        for (let turn = 0; turn < 3; turn++) {
            ({ state, log } = playCard(state, content(), { cardInstanceId: "c3" }));
            all.push(...log);
        }
        assert.deepEqual(heals(all), [10, 8, 8, 8]);
        assert.ok(!state.combatants[0]!.statuses.some((s) => s.statusId === "well-fed"));
    });

    it("lets gear react to food by tag", () => {
        const spiceLover: EffectDef = {
            id: "spice-lover",
            trigger: { event: "foodEaten", as: "actor" },
            conditions: [{ type: "foodHasTag", tag: "spicy" }],
            actions: [{ type: "guard", to: "self", amount: 5 }],
        };
        const start = createBattle([player({ health: 50, lunchbox: lunchbox(), effects: [spiceLover] }), harmless()], 1, content());
        const bread = eatFood(start.state, content(), { slot: 0 });
        assert.ok(!bread.log.some((e) => e.type === "guard"));
        const ramen = eatFood(start.state, content(), { slot: 2 });
        assert.ok(ramen.log.some((e) => e.type === "guard" && e.amount === 5));
    });

    it("boosts the food's own heals by foodHealing, and nothing else", () => {
        const start = createBattle(
            [
                player({
                    health: 40,
                    lunchbox: lunchbox(),
                    modifiers: [{ stat: "foodHealing", kind: "flat", value: 0.5 }],
                }),
                harmless(),
            ],
            1,
            content(),
        );
        const { log } = eatFood(start.state, content(), { slot: 1 });
        // Stew's 10 → 15; Well Fed's regen is a status, not the food, so stays 8.
        assert.deepEqual(heals(log), [15, 8]);
    });
});

describe("damage dealt bonus", () => {
    const boosted = (value: number) => [{ stat: "damageDealt", kind: "flat" as const, value }];
    /** Slow and harmless, so only the player's damage happens. */
    const target = () => spider({ baseStats: { maxHealth: 500, attack: 0, speed: 1 } });

    it("scales attacks, of any element", () => {
        const plain = playCard(createBattle([player(), target()], 1, content()).state, content(), { cardInstanceId: "c0" });
        const strong = playCard(createBattle([player({ modifiers: boosted(0.5) }), target()], 1, content()).state, content(), {
            cardInstanceId: "c0",
        });
        assert.equal(damageTo(plain.log, "enemy:0")[0]!.amount, 10);
        assert.equal(damageTo(strong.log, "enemy:0")[0]!.amount, 15);
        // Fireball: a fire attack for 5.
        const fire = playCard(createBattle([player({ modifiers: boosted(0.5) }), target()], 1, content()).state, content(), {
            cardInstanceId: "c1",
        });
        assert.equal(damageTo(fire.log, "enemy:0")[0]!.amount, 8);
    });

    it("scales damage that isn't an attack, like a proc", () => {
        const zap: EffectDef = {
            id: "zap",
            trigger: { event: "cardPlayed", as: "actor" },
            actions: [{ type: "damage", to: "other", amount: 10, element: "lightning" }],
        };
        const { log } = playCard(
            createBattle([player({ modifiers: boosted(0.5), effects: [zap] }), target()], 1, content()).state,
            content(),
            // Slash, so the zap's "other" is the enemy.
            { cardInstanceId: "c0" },
        );
        assert.equal(damageTo(log, "enemy:0").find((d) => d.element === "lightning")!.amount, 15);
    });

    it("never scales damage to oneself", () => {
        const recoil: EffectDef = {
            id: "recoil",
            trigger: { event: "cardPlayed", as: "actor" },
            actions: [{ type: "damage", to: "self", amount: 10, ignoreDefence: true }],
        };
        const { log } = playCard(
            createBattle([player({ modifiers: boosted(0.5), effects: [recoil] }), target()], 1, content()).state,
            content(),
            { cardInstanceId: "c3" },
        );
        assert.equal(damageTo(log, "player")[0]!.amount, 10);
    });
});

describe("status damage", () => {
    const boosted = [{ stat: "damageDealt", kind: "flat" as const, value: 0.5 }];
    const target = () => spider({ baseStats: { maxHealth: 500, attack: 0, speed: 1 } });

    it("isn't raised by damage-dealt bonuses, even from a status the player carries", () => {
        // A status on the player that hurts whoever attacks them.
        const spikes: StatusDef = {
            id: "spikes",
            name: "Spikes",
            maxStacks: 1,
            effects: [{ id: "spikes.prick", trigger: { event: "attacked", as: "target" }, actions: [{ type: "damage", to: "other", amount: 10 }] }],
        };
        const withSpikes: EngineContent = { ...content(), statuses: { ...content().statuses, spikes } };
        const biter = spider({ baseStats: { maxHealth: 500, attack: 1, speed: 1 } });
        const start = createBattle([player({ modifiers: boosted }), biter], 1, withSpikes);
        start.state.combatants[0]!.statuses.push({ statusId: "spikes", stacks: 1, turnsLeft: null });
        const { log } = playCard(start.state, withSpikes, { cardInstanceId: "c3" });
        assert.equal(damageTo(log, "enemy:0").find((d) => d.effectId === "spikes.prick")!.amount, 10);
    });

    it("can be raised by a rule that asks for it: oil makes burns hurt more", () => {
        // A future "Oil" card's status: burns on an oiled target hit 1.5×.
        const oiled: StatusDef = {
            id: "oiled",
            name: "Oiled",
            maxStacks: 1,
            effects: [
                {
                    id: "oiled.flare",
                    trigger: { event: "beforeDamage", as: "target" },
                    conditions: [{ type: "damageFromStatus", status: "burning" }],
                    actions: [{ type: "modifyDamage", multiply: 1.5 }],
                },
            ],
        };
        const withOil: EngineContent = { ...content(), statuses: { ...content().statuses, oiled } };
        // A fast player and an enemy that attacks, so its Burning ticks.
        const enemy = spider({ baseStats: { maxHealth: 500, attack: 1, speed: 1 } });
        const start = createBattle([player({ modifiers: boosted }), enemy], 1, withOil);
        start.state.combatants[1]!.statuses.push({ statusId: "oiled", stacks: 1, turnsLeft: null });
        const { log } = playCard(start.state, withOil, { cardInstanceId: "c1" });
        const hits = damageTo(log, "enemy:0");
        // Fireball itself: 5 × 1.5 from the player's bonus; oil leaves it alone.
        assert.equal(hits[0]!.amount, 8);
        // The burn: 3, × 1.5 from oil only (the player's bonus never applies).
        assert.equal(hits.find((d) => d.effectId === "burning.tick")!.amount, 5);
    });
});
