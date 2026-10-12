import assert from "node:assert/strict";
import {
    GEO_API_PATHS,
    type GeoFriendsResponse,
    type GeoPresenceResponse,
    type GeoSendFriendResponse,
} from "@cozy/shared/geo";
import { startSmokeServer, step } from "./smoke-kit";

/**
 * End-to-end check of friends against the local database: requests by
 * username, refusals, accepting (and asking back), presence with the
 * server's own "fighting", declining, cancelling and removing.
 * `npm run smoke:geo-friends`.
 */
const { call, registerPlayer, stop } = await startSmokeServer();

const friends = async (token: string) => (await call<GeoFriendsResponse>("GET", GEO_API_PATHS.friends.root, token)).body;
const ask = (token: string, username: string) =>
    call<GeoSendFriendResponse>("POST", GEO_API_PATHS.friends.requests, token, { username });
const beat = (token: string, activity: string, skill?: string) =>
    call<GeoPresenceResponse>("POST", GEO_API_PATHS.presence, token, { activity, skill });

try {
    const ana = await registerPlayer("fr-a");
    const ben = await registerPlayer("fr-b");
    const cat = await registerPlayer("fr-c");
    const a = ana.accessToken;
    const b = ben.accessToken;
    const c = cat.accessToken;

    assert.equal((await ask(a, "no-such-player-anywhere")).status, 404);
    assert.equal((await ask(a, ana.player.displayName)).status, 400);
    step("unknown names and yourself are refused");

    // Case doesn't matter: usernames are unique ignoring it.
    const sent = await ask(a, ben.player.displayName.toUpperCase());
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.result, "sent");
    assert.equal((await ask(a, ben.player.displayName)).status, 400, "asking twice");
    assert.equal((await friends(a)).outgoing.length, 1);
    const incoming = (await friends(b)).incoming;
    assert.equal(incoming.length, 1);
    assert.equal(incoming[0]?.name, ana.player.displayName);
    step("a request by username shows on both sides");

    assert.equal((await beat(b, "exploring")).body.incomingRequests, 1);
    step("the heartbeat answers with the badge count");

    const requestId = incoming[0]!.id;
    const acceptPath = GEO_API_PATHS.friends.accept.replace(":requestId", requestId);
    assert.equal((await call("POST", acceptPath, a)).status, 404, "only the addressee accepts");
    const accepted = await call<GeoFriendsResponse>("POST", acceptPath, b);
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.friends[0]?.name, ana.player.displayName);
    assert.equal(accepted.body.incoming.length, 0);
    assert.equal((await ask(b, ana.player.displayName)).status, 400, "already friends");
    step("accepting makes friends both ways");

    // Ben beat as exploring above; Ana hasn't beat at all.
    let ofAna = (await friends(a)).friends[0]!;
    assert.deepEqual(ofAna.status, { online: true, activity: "exploring", skill: null });
    assert.equal((await friends(b)).friends[0]?.status.online, false);
    await beat(b, "skilling", "fishing");
    ofAna = (await friends(a)).friends[0]!;
    assert.deepEqual(ofAna.status, { online: true, activity: "skilling", skill: "fishing" });
    assert.equal((await beat(b, "skilling")).status, 400, "skilling needs a skill");
    assert.equal((await beat(b, "napping")).status, 400);
    step("status: online with an activity, offline before any beat");

    const run = await call("POST", GEO_API_PATHS.runs.start, b, { kind: "combat", enemyId: "test-chest-boss" });
    assert.equal(run.status, 201, JSON.stringify(run.body));
    const fighting = (await friends(a)).friends[0]!.status;
    assert.ok(fighting.online && fighting.activity === "fighting", JSON.stringify(fighting));
    step("a Run in progress shows as fighting, whatever the app said");

    assert.equal((await call("DELETE", GEO_API_PATHS.presence, b)).status, 204);
    const gone = (await friends(a)).friends[0]!.status;
    assert.ok(!gone.online && gone.lastSeenAt, JSON.stringify(gone));
    step("leaving goes offline at once, with a last-seen time");

    // Cat asks Ana, then Ana asks Cat back: that accepts Cat's.
    await ask(c, ana.player.displayName);
    const back = await ask(a, cat.player.displayName);
    assert.equal(back.body.result, "accepted");
    assert.equal((await friends(a)).friends.length, 2);
    step("asking someone who asked you accepts theirs");

    const removePath = GEO_API_PATHS.friends.friend.replace(":playerId", cat.player.id);
    assert.equal((await call("DELETE", removePath, a)).status, 200);
    assert.equal((await friends(c)).friends.length, 0);
    assert.equal((await call("DELETE", removePath, a)).status, 404);
    step("removing a friend removes it for both");

    await ask(c, ben.player.displayName);
    const toBen = (await friends(c)).outgoing[0]!.id;
    const requestPath = GEO_API_PATHS.friends.request.replace(":requestId", toBen);
    assert.equal((await call("DELETE", requestPath, a)).status, 404, "a stranger can't touch it");
    assert.equal((await call("DELETE", requestPath, b)).status, 200);
    assert.equal((await friends(c)).outgoing.length, 0);
    await ask(c, ben.player.displayName);
    const again = (await friends(c)).outgoing[0]!.id;
    assert.equal((await call("DELETE", GEO_API_PATHS.friends.request.replace(":requestId", again), c)).status, 200);
    assert.equal((await friends(b)).incoming.length, 0);
    step("declining and cancelling both clear the request");
} finally {
    await stop();
}
