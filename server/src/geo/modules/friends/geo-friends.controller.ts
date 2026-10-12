import type { Request, Response } from "express";
import {
    GEO_ACTIVITIES,
    type GeoActivity,
    type GeoPresenceRequest,
    type GeoPresenceResponse,
    type GeoSendFriendRequest,
} from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { requirePlayerId } from "../../middleware/geo-auth";
import { countUnread } from "../inbox/geo-inbox.repository";
import * as friendsRepository from "./geo-friends.repository";

const UUID = /^[0-9a-f-]{36}$/i;
/** A skill id: a short slug, never free text a friend would see. */
const SKILL = /^[a-z][a-z0-9-]{0,39}$/;

function isActivity(activity: unknown): activity is GeoActivity {
    return GEO_ACTIVITIES.includes(activity as GeoActivity);
}

function param(req: Request, name: string, what: string): string {
    const value = String(req.params[name] ?? "");
    if (!UUID.test(value)) throw AppError.notFound(`No such ${what}`);
    return value;
}

export async function getFriends(req: Request, res: Response) {
    res.status(200).json(await friendsRepository.findFriends(requirePlayerId(req)));
}

export async function sendRequest(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const { username } = (req.body ?? {}) as Partial<GeoSendFriendRequest>;
    const name = typeof username === "string" ? username.trim() : "";
    if (!name) throw AppError.badRequest("Enter a username");
    res.status(201).json(await friendsRepository.sendRequest(playerId, name));
}

export async function acceptRequest(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    if (!(await friendsRepository.acceptRequest(playerId, param(req, "requestId", "request")))) {
        throw AppError.notFound("No such request");
    }
    res.status(200).json(await friendsRepository.findFriends(playerId));
}

export async function deleteRequest(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    if (!(await friendsRepository.deleteRequest(playerId, param(req, "requestId", "request")))) {
        throw AppError.notFound("No such request");
    }
    res.status(200).json(await friendsRepository.findFriends(playerId));
}

export async function removeFriend(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    if (!(await friendsRepository.deleteFriend(playerId, param(req, "playerId", "friend")))) {
        throw AppError.notFound("Not friends");
    }
    res.status(200).json(await friendsRepository.findFriends(playerId));
}

export async function beat(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const { activity, skill } = (req.body ?? {}) as Partial<GeoPresenceRequest>;
    if (!isActivity(activity)) throw AppError.badRequest(`activity must be one of ${GEO_ACTIVITIES.join(", ")}`);
    if (activity === "skilling" && (typeof skill !== "string" || !SKILL.test(skill))) {
        throw AppError.badRequest("skilling needs a skill");
    }
    const [incomingRequests, unreadInbox] = await Promise.all([
        friendsRepository.beat(playerId, activity, activity === "skilling" ? skill! : null),
        countUnread(playerId),
    ]);
    const response: GeoPresenceResponse = { incomingRequests, unreadInbox };
    res.status(200).json(response);
}

export async function leave(req: Request, res: Response) {
    await friendsRepository.leave(requirePlayerId(req));
    res.status(204).end();
}
