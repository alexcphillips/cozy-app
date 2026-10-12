import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTENT, sellValueOf, vendorBuys } from "./index";

describe("vendors", () => {
    const farmer = CONTENT.vendors.farmer;

    it("the Farmer sells wheat for 5, with no limit, and buys it back for 1", () => {
        assert.ok(farmer);
        const wheat = farmer.sells.find((offer) => offer.itemId === "wheat");
        assert.equal(wheat?.price, 5);
        assert.equal(wheat?.stock, null);
        const item = CONTENT.items.wheat;
        assert.ok(item && vendorBuys(farmer.buys, item));
        assert.equal(sellValueOf(item), 1);
    });

    it("the Farmer buys farming materials and nothing else", () => {
        assert.ok(farmer);
        for (const item of Object.values(CONTENT.items)) {
            const isFarmingMaterial = item.kind === "material" && item.skill === "farming";
            assert.equal(vendorBuys(farmer.buys, item), isFarmingMaterial, item.id);
        }
    });

    it("never sell anything for less than a vendor pays back for it", () => {
        for (const vendor of Object.values(CONTENT.vendors)) {
            for (const offer of vendor.sells) {
                const item = CONTENT.items[offer.itemId];
                assert.ok(item);
                const boughtBack = Object.values(CONTENT.vendors).some((other) => vendorBuys(other.buys, item));
                if (boughtBack) assert.ok(offer.price >= sellValueOf(item), `${vendor.id} ${offer.itemId}`);
            }
        }
    });
});
