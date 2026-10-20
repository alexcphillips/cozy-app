import assert from "node:assert/strict";
import {
    GEO_API_PATHS,
    type GeoChestsResponse,
    type GeoDungeonRunResponse,
    type GeoDungeonRunView,
    type GeoDungeonsResponse,
    type GeoRunResponse,
    type GeoStartDungeonLobbyResponse,
} from "@cozy/shared/geo";
import { pool } from "../../db";
import { withTransaction } from "../db/transaction";
import { addCoins } from "../modules/player/geo-player.repository";
import { startSmokeServer, step } from "./smoke-kit";

/**
 * End-to-end check of a dungeon map against the local database: the host
 * starts a Slime Pits lobby, walks the rolled map room by room (fights,
 * loot, events, puzzles, the key wing when the layout has one) and loses
 * to Mother Slime with the starter kit, beats her with a Venomfang Dagger
 * and Ragged Pants for the chests, and finally leaves one.
 * `npm run smoke:geo-dungeons`.
 */
const { call, registerPlayer, grant, stop } = await startSmokeServer();

const HERE = { latitude: 51.5007, longitude: -0.1246 };
const paths = GEO_API_PATHS.dungeonRuns;
type Err = { error: string };

try {
    const { accessToken: token, player } = await registerPlayer("dungeons");
    await grant(player.id, [{ itemId: "sluice-key", quantity: 1 }]);

    const created = await call<GeoDungeonsResponse>("POST", GEO_API_PATHS.dungeons.lobbies, token, {
        dungeonId: "slime-pits",
        requiredLevel: 0,
        position: HERE,
        place: HERE,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const lobbyId = created.body.myLobby!.id;
    const started = await call<GeoStartDungeonLobbyResponse>("POST", GEO_API_PATHS.dungeons.start.replace(":lobbyId", lobbyId), token);
    assert.equal(started.status, 200, JSON.stringify(started.body));
    assert.equal(started.body.opened, null);
    let map: GeoDungeonRunView = started.body.dungeonRun!;
    assert.equal(map.status, "active");
    assert.equal(map.health, map.maxHealth);
    assert.ok(
        map.rooms.some((room) => room.kind === "boss" && room.seen === "seen"),
        "the boss room shows from the start",
    );
    assert.ok(map.rooms.every((room) => room.seen === "visited" || map.rooms.some((r) => r.seen === "visited")));
    step(`starting the lobby rolls a map (${map.cols}×${map.rows}), boss in sight, rest under fog`);

    const active = await call<GeoDungeonRunResponse>("GET", paths.active, token);
    assert.equal(active.body.dungeonRun.id, map.id);
    const spawnFight = await call<Err>("POST", GEO_API_PATHS.runs.start, token, {
        kind: "combat",
        enemyId: "green-slime",
    });
    assert.equal(spawnFight.status, 400);
    assert.match(spawnFight.body.error, /in a dungeon/);
    step("the run resumes from GET active, and no other fight can start meanwhile");

    const move = (roomId: number) =>
        call<GeoDungeonRunResponse & Err>("POST", paths.move.replace(":dungeonRunId", map.id), token, { roomId });
    assert.equal((await move(999)).status, 400);
    const boss = map.rooms.find((room) => room.kind === "boss")!;
    const sealed = await move(boss.id);
    assert.equal(sealed.status, 400);
    step(`moves the map doesn't allow are refused ("${sealed.body.error}")`);

    /** Plays the first playable card until the fight ends, eating from the lunchbox at 30 health or less. */
    async function fight(start: GeoRunResponse): Promise<GeoRunResponse> {
        let current = start;
        for (let turn = 0; turn < 300 && current.run.status === "active"; turn++) {
            const you = current.run.combatants.find((c) => c.side === "player")!;
            const food = current.run.lunchbox[0];
            if (you.health <= 30 && food) {
                const ate = await call<GeoRunResponse>("POST", GEO_API_PATHS.runs.turns.replace(":runId", current.run.id), token, {
                    lunchboxSlot: food.slot,
                });
                assert.equal(ate.status, 200, JSON.stringify(ate.body));
                current = ate.body;
                continue;
            }
            const card = current.run.hand.find((c) => c.playable);
            assert.ok(card, "a playable card");
            const enemy = current.run.combatants.find((c) => c.side === "enemy" && c.health > 0);
            const played = await call<GeoRunResponse>("POST", GEO_API_PATHS.runs.turns.replace(":runId", current.run.id), token, {
                inventoryId: card.inventoryId,
                targetId: enemy?.id,
            });
            assert.equal(played.status, 200, JSON.stringify(played.body));
            current = played.body;
        }
        return current;
    }

    const coinsNow = async () =>
        Number((await pool.query<{ coins: string }>(`SELECT coins FROM geo.players WHERE id = $1`, [player.id])).rows[0]!.coins);
    await withTransaction((tx) => addCoins(tx, player.id, 120, "admin-grant", "dungeons-smoke"));

    /** Walks the map: anything seen and not done, the boss last, every fight played card by card. */
    async function walk() {
        const seenKinds = new Set<string>();
        let fights = 0;
        for (let steps = 0; steps < 60 && map.status === "active"; steps++) {
            const options = map.rooms
                .filter((room) => room.id !== map.currentRoom && !room.done && room.kind !== "entrance")
                .sort(
                    (a, b) =>
                        Number(a.kind === "boss") - Number(b.kind === "boss") ||
                        Number(a.seen === "visited") - Number(b.seen === "visited"),
                );
            let moved: (GeoDungeonRunResponse & Err) | null = null;
            for (const room of options) {
                const tried = await move(room.id);
                if (tried.status === 200) {
                    moved = tried.body;
                    seenKinds.add(room.kind);
                    break;
                }
            }
            assert.ok(moved, `some room can be entered (at ${map.currentRoom})`);
            map = moved.dungeonRun;
            if (moved.fight) {
                assert.equal(moved.fight.run.dungeonRunId, map.id);
                const over = await fight(moved.fight);
                if (process.env.DEBUG_SMOKE) {
                    const foe = (r: GeoRunResponse) => r.run.combatants.find((c) => c.side === "enemy")!;
                    const me = (r: GeoRunResponse) => r.run.combatants.find((c) => c.side === "player")!;
                    const [start, end] = [me(moved.fight), me(over)];
                    console.log(`  ${foe(over).name}: you ${start.health}/${start.maxHealth} → ${over.run.status}, foe left ${foe(over).health}, you ${end.health}`);
                }
                fights += 1;
                assert.notEqual(over.run.status, "active");
                if (over.run.status === "defeat") assert.equal(over.run.coinsLost, 0, "a dungeon death costs no coins");

                const now = (await call<GeoDungeonRunResponse | null>("GET", paths.active, token)).body;
                if (now) map = now.dungeonRun;
                else {
                    // Over: read how it ended.
                    const last = await pool.query<{ status: string }>(`SELECT status FROM geo.dungeon_runs WHERE id = $1`, [map.id]);
                    map = { ...map, status: last.rows[0]!.status as GeoDungeonRunView["status"] };
                }
            }
            if (map.puzzle) {
                const answered = await call<GeoDungeonRunResponse>("POST", paths.puzzle.replace(":dungeonRunId", map.id), token, {
                    answer: 0,
                });
                assert.equal(answered.status, 200);
                assert.ok(!JSON.stringify(answered.body).includes('"answer"'));
                map = answered.body.dungeonRun;
            }
            if (map.status === "active") assert.ok(map.health <= map.maxHealth);
        }
        return { seenKinds, fights };
    }

    const before = await coinsNow();
    const first = await walk();
    assert.equal(map.status, "failed", "Mother Slime beats the starter kit");
    const ended = await call<GeoDungeonRunResponse>("GET", paths.one.replace(":dungeonRunId", map.id), token);
    assert.equal(ended.body.dungeonRun.status, "failed", "a finished run can still be read");
    assert.ok((await coinsNow()) >= before, "room fights drop coins, and dying costs none");
    step(`run 1, starter kit for real: ${[...first.seenKinds].join(", ")} rooms, ${first.fights} fights, died to the boss, purse kept`);

    const startAgain = async () => {
        const lobby = await call<GeoDungeonsResponse>("POST", GEO_API_PATHS.dungeons.lobbies, token, {
            dungeonId: "slime-pits",
            requiredLevel: 0,
            position: HERE,
            place: HERE,
        });
        assert.equal(lobby.status, 201, JSON.stringify(lobby.body));
        const go = await call<GeoStartDungeonLobbyResponse>(
            "POST",
            GEO_API_PATHS.dungeons.start.replace(":lobbyId", lobby.body.myLobby!.id),
            token,
        );
        assert.equal(go.status, 200, JSON.stringify(go.body));
        map = go.body.dungeonRun!;
    };

    // Venomfang and one armor piece: Mother Slime is tuned to lose to this.
    await grant(player.id, [
        { itemId: "venomfang-dagger", quantity: 1 },
        { itemId: "ragged-pants", quantity: 1 },
    ]);
    for (const [slot, itemId] of [
        ["mainHand", "venomfang-dagger"],
        ["legs", "ragged-pants"],
    ] as const) {
        const row = await pool.query<{ id: string }>(`SELECT id FROM geo.inventory WHERE player_id = $1 AND item_id = $2`, [
            player.id,
            itemId,
        ]);
        const equipped = await call("PUT", GEO_API_PATHS.me.equipmentSlot.replace(":slot", slot), token, { inventoryId: row.rows[0]!.id });
        assert.equal(equipped.status, 200, JSON.stringify(equipped.body));
    }
    // Run 1 ate the starter bread; a player would restock at camp first.
    const restock = () =>
        pool.query(
            `INSERT INTO geo.lunchbox (player_id, slot, item_id, quantity) VALUES ($1, 0, 'bread', 5)
             ON CONFLICT (player_id, slot) DO UPDATE SET item_id = 'bread', quantity = 5`,
            [player.id],
        );
    await restock();
    await startAgain();
    const second = await walk();
    assert.equal(map.status, "won", "Venomfang and armor beat Mother Slime");
    step(`run 2, Venomfang + Ragged Pants for real: ${second.fights} fights, beat the boss`);

    assert.equal((await call<GeoDungeonRunResponse | null>("GET", paths.active, token)).body, null);
    const chests = await call<GeoChestsResponse>("GET", GEO_API_PATHS.chests.root, token);
    const selection = chests.body.pending.find((s) => s.source.kind === "dungeon");
    assert.ok(selection, "the dungeon's chests wait in the Chests tab");
    assert.equal(selection.chests[0]!.tier, "plain");
    step(`its chests wait in the Chests tab: ${selection.chests.map((c) => c.tier).join(", ")}`);

    // A last run, left at once: failed, no chests, and the player is free again.
    await startAgain();
    const left = await call<GeoDungeonRunResponse>("POST", paths.leave.replace(":dungeonRunId", map.id), token);
    assert.equal(left.body.dungeonRun.status, "failed");
    assert.equal((await call("GET", paths.active, token)).body, null);
    step("leaving a dungeon fails it and frees the player");
} finally {
    await stop();
}
