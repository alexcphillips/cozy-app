import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTENT, reforgeModifiers, reforgesFor, reforgeTarget } from "./index";

describe("reforges", () => {
    it("weapons take weapon reforges, armour and shields armour ones, rings none", () => {
        assert.equal(reforgeTarget(CONTENT.items.broadsword), "weapon");
        assert.equal(reforgeTarget(CONTENT.items["iron-helm"]), "armour");
        assert.equal(reforgeTarget(CONTENT.items["round-shield"]), "armour");
        assert.equal(reforgeTarget(CONTENT.items["ember-ring"]), null);
        assert.deepEqual(reforgesFor(CONTENT, CONTENT.items.broadsword).map((reforge) => reforge.id).sort(), ["keen", "violent"]);
    });

    it("scales with the item's rarity", () => {
        assert.deepEqual(reforgeModifiers(CONTENT, "iron-helm", "heavy"), CONTENT.reforges.heavy!.modifiers.common);
        assert.deepEqual(reforgeModifiers(CONTENT, "iron-greaves", "heavy"), CONTENT.reforges.heavy!.modifiers.uncommon);
    });

    it("gives nothing for no reforge, an unknown one, or one that doesn't fit", () => {
        assert.deepEqual(reforgeModifiers(CONTENT, "iron-helm", null), []);
        assert.deepEqual(reforgeModifiers(CONTENT, "iron-helm", "gone"), []);
        assert.deepEqual(reforgeModifiers(CONTENT, "iron-helm", "keen"), []);
    });

    it("the Blacksmith reforges, with every rarity priced", () => {
        const cost = CONTENT.vendors.blacksmith?.reforge?.cost;
        assert.ok(cost);
        assert.deepEqual(Object.keys(cost).sort(), ["common", "epic", "legendary", "rare", "uncommon"]);
    });
});
