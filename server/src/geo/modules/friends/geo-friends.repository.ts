import {
    GEO_FRIENDS_MAX,
    GEO_ONLINE_WINDOW_SECONDS,
    type GeoActivity,
    type GeoFriend,
    type GeoFriendRequest,
    type GeoFriendsResponse,
    type GeoSendFriendResponse,
} from "@cozy/shared/geo";
import { query } from "../../../db";
import { AppError } from "../../../http/AppError";
import { withTransaction } from "../../db/transaction";
import {
    ACCEPT_REQUEST,
    BEAT,
    COUNT_INCOMING,
    COUNT_RELATIONS,
    DELETE_FRIEND,
    DELETE_REQUEST,
    FIND_FRIENDS,
    FIND_PAIR_FOR_UPDATE,
    FIND_PLAYER_BY_NAME,
    FIND_REQUESTS,
    INSERT_REQUEST,
    LEAVE,
} from "./geo-friends.sql";
import type { FriendRow, PairRow, RequestRow } from "./geo-friends.types";

function toFriend(row: FriendRow): GeoFriend {
    return {
        playerId: row.id,
        name: row.name,
        status: row.online
            ? {
                  online: true,
                  activity: row.fighting ? "fighting" : (row.activity ?? "exploring"),
                  skill: row.fighting ? null : row.activity_skill,
              }
            : { online: false, lastSeenAt: row.last_seen_at?.toISOString() ?? null },
        since: row.accepted_at.toISOString(),
    };
}

function toRequest(row: RequestRow): GeoFriendRequest {
    return { id: row.id, playerId: row.player_id, name: row.name, createdAt: row.created_at.toISOString() };
}

export async function findFriends(playerId: string): Promise<GeoFriendsResponse> {
    const [friendRows, requestRows] = await Promise.all([
        query<FriendRow>(FIND_FRIENDS, [playerId, GEO_ONLINE_WINDOW_SECONDS]),
        query<RequestRow>(FIND_REQUESTS, [playerId]),
    ]);
    const friends = friendRows
        .map(toFriend)
        .sort((a, b) => Number(b.status.online) - Number(a.status.online) || a.name.localeCompare(b.name));
    return {
        friends,
        incoming: requestRows.filter((row) => !row.outgoing).map(toRequest),
        outgoing: requestRows.filter((row) => row.outgoing).map(toRequest),
    };
}

/**
 * Asks `username` to be friends. If they already asked, this accepts theirs
 * instead, so two players asking each other end up friends, not stuck.
 */
export async function sendRequest(playerId: string, username: string): Promise<GeoSendFriendResponse> {
    return withTransaction(async (tx) => {
        const [target] = await tx<{ id: string; name: string }>(FIND_PLAYER_BY_NAME, [username]);
        if (!target) throw AppError.notFound(`No player called "${username}"`);
        if (target.id === playerId) throw AppError.badRequest("You can't add yourself");

        const [pair] = await tx<PairRow>(FIND_PAIR_FOR_UPDATE, [playerId, target.id]);
        if (pair?.status === "accepted") throw AppError.badRequest(`You and ${target.name} are already friends`);
        if (pair && pair.requester_id === playerId) throw AppError.badRequest(`You already asked ${target.name}`);
        if (pair) {
            await tx(ACCEPT_REQUEST, [pair.id, playerId]);
            return { result: "accepted" };
        }

        for (const [id, whose] of [
            [playerId, "You have"],
            [target.id, `${target.name} has`],
        ] as const) {
            const [row] = await tx<{ count: string }>(COUNT_RELATIONS, [id]);
            if (Number(row?.count ?? 0) >= GEO_FRIENDS_MAX) {
                throw AppError.badRequest(`${whose} as many friends and requests as allowed (${GEO_FRIENDS_MAX})`);
            }
        }

        const inserted = await tx(INSERT_REQUEST, [playerId, target.id]);
        // Lost a race with a request between the same two players.
        if (inserted.length === 0) throw AppError.badRequest(`There's already a request between you and ${target.name}`);
        return { result: "sent" };
    });
}

/** False if there's no such request for this player to accept. */
export async function acceptRequest(playerId: string, requestId: string): Promise<boolean> {
    return (await query(ACCEPT_REQUEST, [requestId, playerId])).length > 0;
}

/** Declines (addressee) or cancels (requester). False if there's no such request. */
export async function deleteRequest(playerId: string, requestId: string): Promise<boolean> {
    return (await query(DELETE_REQUEST, [requestId, playerId])).length > 0;
}

/** False if they weren't friends. */
export async function deleteFriend(playerId: string, friendId: string): Promise<boolean> {
    return (await query(DELETE_FRIEND, [playerId, friendId])).length > 0;
}

/** Records the heartbeat; answers with the incoming request count. */
export async function beat(playerId: string, activity: GeoActivity, skill: string | null): Promise<number> {
    await query(BEAT, [playerId, activity, skill]);
    const [row] = await query<{ count: string }>(COUNT_INCOMING, [playerId]);
    return Number(row?.count ?? 0);
}

export async function leave(playerId: string): Promise<void> {
    await query(LEAVE, [playerId]);
}
