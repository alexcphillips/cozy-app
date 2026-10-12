import assert from "node:assert/strict";
import {
    GEO_API_PATHS,
    type GeoFishingAction,
    type GeoFishingRunView,
    type GeoMeResponse,
    type GeoRunResponse,
} from "@cozy/shared/geo";
import { CONTENT } from "../content";
import { startSmokeServer, step } from "./smoke-kit";

/**
 * End-to-end check of a fishing Run against the local database: the starter
 * fishing hand and worms, a cast spending one bait, charges spent per card, a
 * landed fish in the inventory with its XP, the hand locked mid-Run, Soulbound
 * fish refused by the Market and vendors, and leaving. `npm run smoke:geo-fishing`.
 */
const { call, registerPlayer, grant, stop } = await startSmokeServer();

const me = async (token: string) => (await call<GeoMeResponse>("GET", GEO_API_PATHS.me.root, token)).body;
const baitLeft = (body: GeoMeResponse) => body.bait.contents.reduce((sum, slot) => sum + slot.quantity, 0);
const actPath = (runId: string) => GEO_API_PATHS.fishing.actions.replace(":runId", runId);

try {
    const player = await registerPlayer("fishing");
    const token = player.accessToken;

    const start = await me(token);
    assert.equal(start.hands.fishing?.length, 4, "a starter fishing hand");
    assert.equal(baitLeft(start), 20, "20 worms packed");
    step("starter kit: four fishing cards in the fishing hand, 20 worms in the bait slot");

    const refused = await call("POST", GEO_API_PATHS.fishing.start, token, { tier: "ocean-ish" });
    assert.equal(refused.status, 400);
    let run = (await call<GeoFishingRunView>("POST", GEO_API_PATHS.fishing.start, token, { tier: "pond" })).body;
    assert.equal(run.phase, "ready");
    assert.equal(run.hand.length, 4);
    const resumed = (await call<GeoFishingRunView>("POST", GEO_API_PATHS.fishing.start, token, { tier: "pond" })).body;
    assert.equal(resumed.id, run.id, "opening again resumes the same Run");
    step("open a fishing Run at a pond; opening again resumes it");

    const handChange = await call("PUT", GEO_API_PATHS.me.hand.replace(":skill", "fishing"), token, { inventoryIds: [] });
    assert.equal(handChange.status, 400, "the fishing hand is locked mid-Run");
    step("the fishing hand can't change mid-Run");

    const act = async (action: GeoFishingAction) => {
        const response = await call<GeoFishingRunView>("POST", actPath(run.id), token, action);
        assert.equal(response.status, 200, JSON.stringify(response.body));
        run = response.body;
        return run;
    };

    // Cast until something lands, with the playground's simple policy.
    let casts = 0;
    let cardsPlayed = 0;
    let baitUsed = 0;
    let landed: Extract<GeoFishingRunView["outcome"], { kind: "landed" }> | null = null;
    while (!landed) {
        assert.ok(casts < 20, "landed nothing in 20 casts");
        const before = baitLeft(await me(token));
        await act({ type: "cast" });
        casts++;
        const used = before - baitLeft(await me(token));
        // A mayor's Bait Lover can save one.
        assert.ok(used === 1 || used === 0, "at most one bait per cast");
        baitUsed += used;
        // `act` reassigns `run`; read the phase fresh each time.
        const phase = () => run.phase as GeoFishingRunView["phase"];
        while (phase() !== "over") {
            if (phase() === "waiting") await act({ type: run.signal === "bite" ? "strike" : "wait" });
            // Play it out, so the cards (and their charges) get exercised.
            else if (phase() === "outclassed") await act({ type: "playOut" });
            else if (phase() === "creature") await act({ type: "cutLine" });
            else {
                const f = run.fight!;
                const pick = f.distance <= 2 ? "fish.gaff" : f.tension > f.zoneHigh ? "fish.slack" : "fish.reel";
                const card = run.hand.find((c) => c.cardId === pick)!;
                await act({ type: "play", inventoryId: card.inventoryId });
                cardsPlayed++;
            }
        }
        if (run.outcome?.kind === "landed" && cardsPlayed > 0) landed = run.outcome;
    }
    assert.ok(baitUsed > 0 || casts < 3, "bait is spent");
    step(`each cast spends one worm (${baitUsed} used, ${casts} cast${casts === 1 ? "" : "s"}, ${cardsPlayed} cards played)`);

    const after = await me(token);
    const caught = after.inventory.find((entry) => entry.itemId === landed.itemId);
    assert.ok(caught, `${landed.itemId} is in the inventory`);
    assert.ok((after.skillXp.fishing ?? 0) >= landed.xp, "fishing XP");
    

    for (const card of run.hand) {
        const entry = after.inventory.find((e) => e.id === card.inventoryId);
        assert.equal(entry?.chargesLeft, card.chargesLeft, "charges saved");
    }
    step(`landed a ${landed.tier ?? "regular"} ${landed.name} (${landed.how}): in the inventory, +${landed.xp} fishing XP, charges saved`);

    // A combat Run started from here leaves the fishing spot.
    const fight = await call<GeoRunResponse>("POST", GEO_API_PATHS.runs.start, token, { kind: "combat", enemyId: "spider" });
    if (fight.status === 201) {
        const gone = await call("POST", actPath(run.id), token, { type: "cast" });
        assert.equal(gone.status, 400, "the fishing Run ended when the fight started");
        await call("POST", GEO_API_PATHS.runs.flee.replace(":runId", fight.body.run.id), token);
        step("starting a fight leaves the fishing spot");
    }

    // Soulbound fish stay put.
    const [silverId] = await grant(player.player.id, [{ itemId: "fish.salmon.silver", quantity: 1 }]);
    const listing = await call("POST", GEO_API_PATHS.market.listings, token, {
        inventoryId: silverId,
        quantity: 1,
        type: "bin",
        price: 100,
    });
    assert.equal(listing.status, 400, JSON.stringify(listing.body));
    const sale = await call("POST", GEO_API_PATHS.vendors.sell.replace(":vendorId", "angler"), token, {
        inventoryId: silverId,
        quantity: 1,
    });
    assert.equal(sale.status, 400, JSON.stringify(sale.body));
    step("a Soulbound Silver Salmon can't be listed or sold");

    const reopened = (await call<GeoFishingRunView>("POST", GEO_API_PATHS.fishing.start, token, { tier: "pond" })).body;
    const left = await call("POST", GEO_API_PATHS.fishing.leave.replace(":runId", reopened.id), token);
    assert.equal(left.status, 204);
    const afterLeave = await call("POST", actPath(reopened.id), token, { type: "cast" });
    assert.equal(afterLeave.status, 400);
    step("leaving ends the Run");

    console.log("\nFishing smoke passed.");
} finally {
    await stop();
}
