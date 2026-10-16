import {
    GEO_DUNGEON_ENTER_SECONDS,
    GEO_DUNGEON_LOBBY_SECONDS,
    type GeoDungeon,
    type GeoDungeonLobby,
    type GeoDungeonsResponse,
    type GeoRunResponse,
} from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { CONTENT, type DungeonDef } from "../../content";
import { withTransaction, type TxQuery } from "../../db/transaction";
import { hasArt } from "../../world";
import * as playerRepository from "../player/geo-player.repository";
import * as runsRepository from "../runs/geo-runs.repository";
import { lobbyPhase, requiredLevelProblem } from "./geo-dungeons.rules";
import {
    CLOSE_LOBBY,
    DELETE_MEMBER,
    FIND_LOBBY,
    FIND_MEMBERS,
    FIND_PLAYER_LOBBY,
    INSERT_LOBBY,
    INSERT_MEMBER,
    LIST_OPEN_LOBBIES,
    LOCK_LOBBY,
    MARK_ENTERED,
    START_LOBBY,
} from "./geo-dungeons.sql";
import type { LobbyRow, MemberRow } from "./geo-dungeons.types";

/** Most open lobbies one `GET /geo/dungeons` lists. */
const MAX_LISTED = 100;

/** A dungeon is only offered once the app can draw its boss, as with spawns. */
function offeredDungeon(dungeonId: string): DungeonDef | undefined {
    const dungeon = CONTENT.dungeons[dungeonId];
    return dungeon && hasArt(dungeon.boss) ? dungeon : undefined;
}

function toDungeonView(dungeon: DungeonDef): GeoDungeon {
    const boss = CONTENT.enemies[dungeon.boss]!;
    return {
        id: dungeon.id,
        name: dungeon.name,
        description: dungeon.description,
        bossName: boss.name,
        bossSprite: boss.sprite,
        minCombatLevel: dungeon.minCombatLevel,
        maxPlayers: dungeon.maxPlayers,
    };
}

function toLobbyView(row: LobbyRow, members?: { rows: MemberRow[]; viewerId: string }): GeoDungeonLobby | null {
    const { phase, secondsLeft } = lobbyPhase(row);
    if (phase !== "open" && phase !== "started") return null;
    return {
        id: row.id,
        dungeonId: row.dungeon_id,
        hostName: row.host_name,
        requiredLevel: row.required_level,
        playerCount: row.player_count,
        maxPlayers: row.max_players,
        phase,
        secondsLeft,
        ...(members && {
            members: members.rows.map((member) => ({
                displayName: member.display_name,
                isHost: member.player_id === row.host_id,
                isYou: member.player_id === members.viewerId,
                hasEntered: member.has_entered,
            })),
        }),
    };
}

async function combatLevelOf(tx: TxQuery, playerId: string): Promise<number> {
    return (await playerRepository.findSkillLevels(tx, playerId)).combat ?? 1;
}

async function findPlayerLobby(tx: TxQuery, playerId: string): Promise<LobbyRow | undefined> {
    const [row] = await tx<LobbyRow>(FIND_PLAYER_LOBBY, [playerId, GEO_DUNGEON_ENTER_SECONDS]);
    return row;
}

/** Locks the lobby and reads it fresh; refuses one that's gone. */
async function lockLobby(tx: TxQuery, lobbyId: string): Promise<LobbyRow> {
    const [locked] = await tx<{ id: string }>(LOCK_LOBBY, [lobbyId]);
    const [row] = locked ? await tx<LobbyRow>(FIND_LOBBY, [lobbyId]) : [];
    if (!row) throw AppError.notFound("That lobby is gone");
    return row;
}

/**
 * What the dungeon menu shows: every dungeon on offer, the lobbies still
 * counting down, and the player's own lobby with who's in it.
 */
export async function listDungeons(tx: TxQuery, playerId: string): Promise<GeoDungeonsResponse> {
    const dungeons = Object.values(CONTENT.dungeons).flatMap((dungeon) =>
        offeredDungeon(dungeon.id) ? [toDungeonView(dungeon)] : [],
    );
    const mine = await findPlayerLobby(tx, playerId);
    const open = await tx<LobbyRow>(LIST_OPEN_LOBBIES, [MAX_LISTED]);
    const lobbies = open.flatMap((row) =>
        row.id !== mine?.id && offeredDungeon(row.dungeon_id) ? (toLobbyView(row) ?? []) : [],
    );
    const myLobby = mine ? toLobbyView(mine, { rows: await tx<MemberRow>(FIND_MEMBERS, [mine.id]), viewerId: playerId }) : null;
    return { dungeons, lobbies, myLobby, combatLevel: await combatLevelOf(tx, playerId) };
}

/** One lobby at a time: a player must leave or enter theirs before another. */
async function assertNotInLobby(tx: TxQuery, playerId: string) {
    if (await findPlayerLobby(tx, playerId)) throw AppError.badRequest("You're already in a lobby. Leave it first.");
}

/** Opens a lobby for a dungeon, hosted by the player, counting down from GEO_DUNGEON_LOBBY_SECONDS. */
export async function createLobby(playerId: string, dungeonId: string, requiredLevel: unknown): Promise<GeoDungeonsResponse> {
    const dungeon = offeredDungeon(dungeonId);
    if (!dungeon) throw AppError.badRequest("Unknown dungeon");
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        await assertNotInLobby(tx, playerId);
        const problem = requiredLevelProblem(requiredLevel, dungeon.minCombatLevel, await combatLevelOf(tx, playerId));
        if (problem) throw AppError.badRequest(problem);
        const [lobby] = await tx<{ id: string }>(INSERT_LOBBY, [
            dungeon.id,
            playerId,
            requiredLevel,
            dungeon.maxPlayers,
            GEO_DUNGEON_LOBBY_SECONDS,
        ]);
        await tx(INSERT_MEMBER, [lobby!.id, playerId]);
        return listDungeons(tx, playerId);
    });
}

export async function joinLobby(playerId: string, lobbyId: string): Promise<GeoDungeonsResponse> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        const current = await findPlayerLobby(tx, playerId);
        if (current?.id === lobbyId) return listDungeons(tx, playerId);
        if (current) throw AppError.badRequest("You're already in a lobby. Leave it first.");

        const lobby = await lockLobby(tx, lobbyId);
        if (lobbyPhase(lobby).phase !== "open") throw AppError.badRequest("That lobby has already started");
        if (lobby.player_count >= lobby.max_players) throw AppError.badRequest("That lobby is full");
        if ((await combatLevelOf(tx, playerId)) < lobby.required_level) {
            throw AppError.badRequest(`That lobby needs combat level ${lobby.required_level}`);
        }
        await tx(INSERT_MEMBER, [lobbyId, playerId]);
        return listDungeons(tx, playerId);
    });
}

/**
 * Leaves the lobby. The host leaving one still counting down closes it for
 * everyone; once started, everyone's free to enter whether the host does or not.
 */
export async function leaveLobby(playerId: string, lobbyId: string): Promise<GeoDungeonsResponse> {
    return withTransaction(async (tx) => {
        const lobby = await lockLobby(tx, lobbyId);
        if (lobby.host_id === playerId && lobbyPhase(lobby).phase === "open") await tx(CLOSE_LOBBY, [lobbyId]);
        else await tx(DELETE_MEMBER, [lobbyId, playerId]);
        return listDungeons(tx, playerId);
    });
}

/** The host starts the lobby before its countdown ends. */
export async function startLobby(playerId: string, lobbyId: string): Promise<GeoDungeonsResponse> {
    return withTransaction(async (tx) => {
        const lobby = await lockLobby(tx, lobbyId);
        if (lobby.host_id !== playerId) throw AppError.forbidden("Only the host can start the lobby");
        if (lobbyPhase(lobby).phase !== "open") throw AppError.badRequest("That lobby has already started");
        await tx(START_LOBBY, [lobbyId]);
        return listDungeons(tx, playerId);
    });
}

/**
 * Begins the player's Run against the dungeon's boss. Solo for now: each
 * member who enters gets their own fight, with the boss made bigger by the
 * dungeon's `bossModifiers`. Only once per lobby.
 */
export async function enterLobby(playerId: string, lobbyId: string): Promise<GeoRunResponse> {
    return withTransaction(async (tx) => {
        await playerRepository.lockPlayer(tx, playerId);
        const lobby = await lockLobby(tx, lobbyId);
        const me = (await tx<MemberRow>(FIND_MEMBERS, [lobbyId])).find((member) => member.player_id === playerId);
        if (!me) throw AppError.badRequest("You're not in that lobby");
        if (me.has_entered) throw AppError.badRequest("You've already entered this dungeon");
        const { phase } = lobbyPhase(lobby);
        if (phase === "open") throw AppError.badRequest("The lobby hasn't started yet");
        if (phase !== "started") throw AppError.badRequest("That lobby is over");
        const dungeon = CONTENT.dungeons[lobby.dungeon_id];
        if (!dungeon) throw AppError.badRequest("That dungeon no longer exists");

        const opened = await runsRepository.openCombatRun(tx, playerId, {
            enemyId: dungeon.boss,
            spawnId: null,
            enemyModifiers: dungeon.bossModifiers,
        });
        await tx(MARK_ENTERED, [lobbyId, playerId]);
        return opened;
    });
}
