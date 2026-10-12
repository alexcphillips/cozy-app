import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enemyCombatant, playerCombatant } from "../combat/combatants";
import { canWield, createBattle, playCard } from "../engine/battle";
import { CONTENT } from "./index";

/** The real content loads, and every card can be played in a real fight. */
describe("game content", () => {
    it("loads without broken references", () => {
        assert.ok(Object.keys(CONTENT.items).length > 0);
    });

    for (const card of Object.values(CONTENT.cards)) {
        it(`plays ${card.id} against every enemy`, () => {
            const weapon = Object.values(CONTENT.items).find(
                (item) => item.kind === "equipment" && item.weapon && canWield(card, [item.weapon.type, item.weapon.style]),
            );
            assert.ok(weapon, `some weapon can play ${card.id}`);
            for (const enemyId of Object.keys(CONTENT.enemies)) {
                const hand = [{ instanceId: "i0", cardId: card.id, chargesLeft: 5 }];
                const setup = [
                    playerCombatant({ name: "You", equipment: [weapon.id], talismans: ["storm-charm"], hand }, CONTENT),
                    enemyCombatant(enemyId, 0, CONTENT),
                ];
                const start = createBattle(setup, 7, CONTENT);
                if (start.state.outcome !== "ongoing") continue;
                const { state } = playCard(start.state, CONTENT, { cardInstanceId: "i0" });
                assert.ok(state.round >= 1);
            }
        });
    }
});
