import assert from "node:assert/strict";
import { GEO_API_PATHS, type GeoFarmAction, type GeoFarmView, type GeoMeResponse } from "@cozy/shared/geo";
import { CONTENT } from "../content";
import { withTransaction } from "../db/transaction";
import { addCoins } from "../modules/player/geo-player.repository";
import { startSmokeServer, step } from "./smoke-kit";

/**
 * End-to-end check of the farm against the local database: the starter
 * farming hand and Seed Bag, a farm made on first look, planting spending a
 * seed, Labor and banked turns enforced, a harvest into the inventory with
 * its XP, a card charge spent, a tile bought with coins, and packing seeds.
 * `npm run smoke:geo-farming`.
 */
const { call, registerPlayer, stop } = await startSmokeServer();

const me = async (token: string) => (await call<GeoMeResponse>("GET", GEO_API_PATHS.me.root, token)).body;
const MID = 40;

try {
    const player = await registerPlayer("farming");
    const token = player.accessToken;
    const playerId = (await me(token)).player.id;

    const start = await me(token);
    assert.equal(start.hands.farming?.length, 4, "a starter farming hand");
    assert.deepEqual(
        start.seedBag.contents.map((slot) => [slot.itemId, slot.quantity]),
        [
            ["wheat-seeds", 12],
            ["carrot-seeds", 6],
        ],
    );
    step("starter kit: four farming cards in hand, wheat and carrot seeds in the Seed Bag");

    let farm = (await call<GeoFarmView>("GET", GEO_API_PATHS.farm.root, token)).body;
    assert.equal(farm.tiles.filter((tile) => tile.owned).length, 9);
    assert.equal(farm.labor, 3);
    assert.equal(farm.turnsBanked, 2);
    assert.equal(farm.hand.length, 4);
    step("first look makes a 3×3 farm with 3 Labor and 2 turns banked");

    const act = async (action: GeoFarmAction, status = 200) => {
        const response = await call<GeoFarmView>("POST", GEO_API_PATHS.farm.actions, token, action);
        assert.equal(response.status, status, JSON.stringify(response.body));
        if (status === 200) farm = response.body;
        return response;
    };

    await act({ type: "plant", tile: MID, slot: 0 });
    assert.equal(farm.seedBag.contents[0]!.quantity, 11);
    assert.equal(farm.tiles[MID]!.crop?.cropId, "wheat");
    await act({ type: "plant", tile: MID, slot: 0 }, 400);
    await act({ type: "plant", tile: 0, slot: 0 }, 400);
    step("planting takes a seed; occupied and locked tiles are refused");

    await act({ type: "water", tile: MID });
    await act({ type: "water", tile: MID });
    await act({ type: "water", tile: MID });
    assert.equal(farm.labor, 0);
    await act({ type: "water", tile: MID }, 400);
    step("watering spends Labor, and runs out");

    await act({ type: "advance" });
    await act({ type: "advance" });
    assert.equal(farm.turnsBanked, 0);
    assert.equal(farm.labor, 3);
    await act({ type: "advance" }, 400);
    step("Advance spends a banked turn and refills Labor; none banked is refused");

    // Skip the clock: bank turns by hand, and keep the wheat watered until it's ripe.
    await withTransaction((tx) => tx(`UPDATE geo.farms SET state = jsonb_set(state, '{turnsBanked}', '10') WHERE player_id = $1`, [playerId]));
    for (let guard = 0; !farm.tiles[MID]!.crop!.ripe; guard++) {
        assert.ok(guard < 10, "wheat never ripened");
        if (farm.tiles[MID]!.moisture === 0) await act({ type: "water", tile: MID });
        await act({ type: "advance" });
    }
    const pick = farm.hand.find((card) => card.cardId === "farm.careful-pick")!;
    await act({ type: "play", inventoryId: pick.inventoryId, tile: MID });
    const wheat = farm.gained.find((gain) => gain.itemId === "wheat");
    assert.ok(wheat && wheat.quantity >= 1, "harvested wheat");
    assert.equal(farm.hand.find((card) => card.inventoryId === pick.inventoryId)!.chargesLeft, pick.chargesLeft - 1);
    const after = await me(token);
    assert.ok(after.inventory.some((entry) => entry.itemId === "wheat" && entry.quantity === wheat.quantity));
    assert.equal(after.skillXp.farming, CONTENT.crops.wheat!.xp);
    assert.equal(after.inventory.find((entry) => entry.id === pick.inventoryId)!.chargesLeft, pick.chargesLeft - 1);
    step(`Careful Pick harvested ${wheat.quantity} wheat into the inventory, with farming XP and a charge spent`);

    const edge = MID - 2;
    await act({ type: "unlock", tile: edge }, 400);
    await withTransaction((tx) => addCoins(tx, playerId, 1000, "vendor-sell", "smoke"));
    await act({ type: "unlock", tile: edge });
    assert.ok(farm.tiles[edge]!.owned);
    assert.equal((await me(token)).player.coins, 1000 - 50);
    step("a tile next to the farm costs coins, refused without them");

    await act({ type: "blueprint", tile: 0, cropId: "melon" });
    assert.equal(farm.tiles[0]!.blueprint, "melon");
    step("blueprints plan any tile");

    const unpacked = (await call<GeoMeResponse>("DELETE", GEO_API_PATHS.me.seedBagSlot.replace(":slot", "1"), token)).body;
    assert.equal(unpacked.seedBag.contents.length, 1);
    assert.ok(unpacked.inventory.some((entry) => entry.itemId === "carrot-seeds" && entry.quantity === 6));
    const notSeeds = await call("PUT", GEO_API_PATHS.me.seedBagSlot.replace(":slot", "1"), token, { itemId: "wheat", quantity: 1 });
    assert.equal(notSeeds.status, 400);
    const repacked = (await call<GeoMeResponse>("PUT", GEO_API_PATHS.me.seedBagSlot.replace(":slot", "1"), token, { itemId: "carrot-seeds", quantity: 4 })).body;
    assert.equal(repacked.seedBag.contents.find((slot) => slot.slot === 1)?.quantity, 4);
    step("seeds unpack and repack; anything else is refused");
} finally {
    await stop();
}
