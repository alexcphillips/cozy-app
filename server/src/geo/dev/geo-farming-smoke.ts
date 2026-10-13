import assert from "node:assert/strict";
import { GEO_API_PATHS, type GeoFarmAction, type GeoFarmView, type GeoInboxResponse, type GeoMeResponse } from "@cozy/shared/geo";
import { CONTENT, FARMING } from "../content";
import { weekEndsAt } from "../farming/farm";
import { settleFarmWeeks } from "../modules/farming/geo-farming.contests";
import { withTransaction } from "../db/transaction";
import { addCoins, grantItems } from "../modules/player/geo-player.repository";
import { startSmokeServer, step } from "./smoke-kit";

/**
 * End-to-end check of the farm against the local database: the starter
 * farming hand and Seed Bag, a farm made on first look, planting spending a
 * seed, Labor and banked turns enforced, a harvest into the inventory with
 * its XP, a card charge spent, a pest swatted for its drop, a tile bought
 * with coins, a mutation turned in at the Research Lab, an order delivered,
 * a structure placed and picked up, a Shrine offering, and packing seeds.
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
    assert.equal(start.hands.farming?.length, 5, "a starter farming hand");
    assert.deepEqual(
        start.seedBag.contents.map((slot) => [slot.itemId, slot.quantity]),
        [
            ["wheat-seeds", 12],
            ["carrot-seeds", 6],
        ],
    );
    step("starter kit: five farming cards in hand, wheat and carrot seeds in the Seed Bag");

    let farm = (await call<GeoFarmView>("GET", GEO_API_PATHS.farm.root, token)).body;
    assert.equal(farm.tiles.filter((tile) => tile.owned).length, 9);
    assert.equal(farm.labor, 3);
    assert.equal(farm.turnsBanked, 2);
    assert.equal(farm.hand.length, 5);
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
    for (let guard = 0; !farm.tiles[MID]!.crop?.ripe; guard++) {
        assert.ok(guard < 20, "wheat never ripened");
        // Placeholder weather can storm or frost the wheat away: plant again.
        if (!farm.tiles[MID]!.crop) await act({ type: "plant", tile: MID, slot: 0 });
        if (farm.tiles[MID]!.moisture === 0) await act({ type: "water", tile: MID });
        // Pests may come for the wheat: swat each before it acts.
        for (const tile of new Set(farm.pests.map((pest) => pest.tile))) if (farm.labor >= 2) await act({ type: "swat", tile });
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

    const mouse = { id: 999, pestId: "field-mouse", tile: MID, age: 0, intent: { kind: "move", tile: MID } };
    await withTransaction((tx) =>
        tx(`UPDATE geo.farms SET state = jsonb_set(jsonb_set(state, '{pests}', $2::jsonb), '{labor}', '3') WHERE player_id = $1`, [
            playerId,
            JSON.stringify([mouse]),
        ]),
    );
    await act({ type: "swat", tile: MID });
    assert.equal(farm.pests.length, 0);
    assert.equal(farm.labor, 1);
    assert.ok(farm.gained.some((gain) => gain.itemId === "mouse-tail"));
    assert.ok((await me(token)).inventory.some((entry) => entry.itemId === "mouse-tail"));
    await act({ type: "swat", tile: MID }, 400);
    step("Swat clears a pest for 2 Labor, its drop into the inventory");

    const edge = MID - 2;
    await act({ type: "unlock", tile: edge }, 400);
    await withTransaction((tx) => addCoins(tx, playerId, 1000, "vendor-sell", "smoke"));
    await act({ type: "unlock", tile: edge });
    assert.ok(farm.tiles[edge]!.owned);
    assert.equal((await me(token)).player.coins, 1000 - 50);
    step("a tile next to the farm costs coins, refused without them");

    const coinsBefore = (await me(token)).player.coins;
    assert.equal(farm.lab.found.length, 0);
    assert.equal(farm.lab.total, Object.keys(CONTENT.mutations).length);
    await withTransaction((tx) => grantItems(tx, playerId, [{ itemId: "emberwheat", quantity: 1 }]));
    farm = (await call<GeoFarmView>("GET", GEO_API_PATHS.farm.root, token)).body;
    assert.deepEqual(farm.lab.ready.map((entry) => entry.mutationId), ["emberwheat"]);
    farm = (await call<GeoFarmView>("POST", GEO_API_PATHS.farm.lab, token, { mutationId: "emberwheat" })).body;
    assert.deepEqual(farm.lab.found.map((entry) => entry.mutationId), ["emberwheat"]);
    assert.ok(farm.crops.some((crop) => crop.id === "emberwheat" && crop.mutation));
    const researched = await me(token);
    assert.equal(researched.player.coins, coinsBefore + CONTENT.mutations.emberwheat!.research.coins);
    assert.ok(!researched.inventory.some((entry) => entry.itemId === "emberwheat"));
    assert.equal((await call("POST", GEO_API_PATHS.farm.lab, token, { mutationId: "emberwheat" })).status, 400);
    step("the Research Lab takes the first Emberwheat, logs its recipe and pays once");

    const harvestStanding = farm.contests.standings.find((standing) => standing.contest === "harvest")!;
    assert.ok(harvestStanding.score > 0 && harvestStanding.rank !== null, "the harvest counted for this week's contest");
    // Settle a made-up week long past, so no real week is touched; cleared first, so runs repeat.
    await withTransaction(async (tx) => {
        await tx(`DELETE FROM geo.farm_weeks WHERE week IN (1, 2)`);
        await tx(`DELETE FROM geo.farm_contest_scores WHERE week = 1`);
        await tx(`INSERT INTO geo.farm_contest_scores (week, contest, player_id, score) VALUES (1, 'harvest', $1, 50)`, [playerId]);
    });
    const beforePrize = (await me(token)).player.coins;
    await settleFarmWeeks(weekEndsAt(1));
    assert.equal((await me(token)).player.coins, beforePrize + FARMING.contests.prizes[0]!);
    const inbox = (await call<GeoInboxResponse>("GET", GEO_API_PATHS.inbox.root, token)).body;
    assert.ok(inbox.messages.some((message) => message.kind === "contest"));
    await settleFarmWeeks(weekEndsAt(1));
    assert.equal((await me(token)).player.coins, beforePrize + FARMING.contests.prizes[0]!, "a week pays out once");
    step("a harvest scores for the week's contest; a finished week pays its winner once, with an inbox message");

    assert.equal(farm.orders.orders.length, 3);
    const order = farm.orders.orders[0]!;
    const beforeOrder = (await me(token)).player.coins;
    await act({ type: "accept-order", orderId: order.id });
    await withTransaction((tx) => grantItems(tx, playerId, [{ itemId: order.itemId, quantity: order.quantity }]));
    await act({ type: "deliver-order", orderId: order.id });
    assert.equal(farm.orders.orders[0]!.status, "done");
    assert.equal((await me(token)).player.coins, beforeOrder + order.reward);
    step("an Order Board order takes a deposit, and pays reward plus deposit on delivery");

    await withTransaction((tx) => grantItems(tx, playerId, [{ itemId: "structure.compost-bin", quantity: 1 }]));
    farm = (await call<GeoFarmView>("GET", GEO_API_PATHS.farm.root, token)).body;
    assert.deepEqual(farm.structureKit.map((entry) => entry.structureId), ["compost-bin"]);
    await act({ type: "place", tile: MID, itemId: "structure.compost-bin" });
    assert.equal(farm.tiles[MID]!.structure?.structureId, "compost-bin");
    assert.ok(!(await me(token)).inventory.some((entry) => entry.itemId === "structure.compost-bin"));
    await act({ type: "place", tile: MID, itemId: "structure.compost-bin" }, 400);
    await act({ type: "pickup", tile: MID });
    assert.equal(farm.tiles[MID]!.structure, null);
    assert.ok((await me(token)).inventory.some((entry) => entry.itemId === "structure.compost-bin"));
    step("a Compost Bin leaves the inventory when placed, and comes back on pick-up");

    await withTransaction((tx) => grantItems(tx, playerId, [{ itemId: "structure.mysterious-shrine", quantity: 1 }, { itemId: "mouse-tail", quantity: 4 }]));
    farm = (await call<GeoFarmView>("GET", GEO_API_PATHS.farm.root, token)).body;
    await act({ type: "place", tile: MID, itemId: "structure.mysterious-shrine" });
    const tailsBefore = (await me(token)).inventory.find((entry) => entry.itemId === "mouse-tail")?.quantity ?? 0;
    await act({ type: "offer", tile: MID, itemId: "mouse-tail", quantity: 4 });
    assert.ok(farm.log.some((line) => line.startsWith("The Shrine")), "the Shrine answered");
    assert.equal((await me(token)).inventory.find((entry) => entry.itemId === "mouse-tail")?.quantity ?? 0, tailsBefore - 4);
    await act({ type: "pickup", tile: MID });
    step("the Mysterious Shrine takes an offering from the inventory and answers");

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
