import { GEO_DUNGEON_ENTER_SECONDS, type GeoDungeonLobbyPhase } from "@cozy/shared/geo";
import type { LobbyRow } from "./geo-dungeons.types";

/** Where a lobby is in its life. Only `open` and `started` lobbies are shown. */
export type LobbyPhase = GeoDungeonLobbyPhase | "closed" | "expired";

type Timed = Pick<LobbyRow, "starts_at" | "started_at" | "closed_at" | "now">;

/**
 * A lobby's phase and the seconds left in it, worked out from its times
 * rather than kept: nothing ticks a lobby along. Open until `starts_at` (or
 * the host starts it early), then started for GEO_DUNGEON_ENTER_SECONDS.
 */
export function lobbyPhase(lobby: Timed): { phase: LobbyPhase; secondsLeft: number } {
    if (lobby.closed_at) return { phase: "closed", secondsLeft: 0 };
    const now = lobby.now.getTime();
    const secondsUntil = (time: number) => Math.max(0, Math.ceil((time - now) / 1000));
    if (!lobby.started_at && now < lobby.starts_at.getTime()) {
        return { phase: "open", secondsLeft: secondsUntil(lobby.starts_at.getTime()) };
    }
    const enterEnds = (lobby.started_at ?? lobby.starts_at).getTime() + GEO_DUNGEON_ENTER_SECONDS * 1000;
    if (now < enterEnds) return { phase: "started", secondsLeft: secondsUntil(enterEnds) };
    return { phase: "expired", secondsLeft: 0 };
}

/**
 * Why a host can't ask for this combat level, or null if they can: from the
 * dungeon's minimum up to their own level, so nobody makes a lobby they
 * couldn't join themselves.
 */
export function requiredLevelProblem(requiredLevel: unknown, dungeonMin: number, hostLevel: number): string | null {
    if (!Number.isInteger(requiredLevel)) return "requiredLevel must be a whole number";
    if (hostLevel < dungeonMin) return `This dungeon needs combat level ${dungeonMin}`;
    const level = requiredLevel as number;
    if (level < dungeonMin) return `This dungeon needs at least combat level ${dungeonMin}`;
    if (level > hostLevel) return "You can't ask for a higher combat level than your own";
    return null;
}
