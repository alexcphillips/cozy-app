/**
 * Dungeons: raid-style boss fights, gathered for in lobbies.
 *
 * A POI is a lobby entrance. Every POI opens the same worldwide list of open
 * lobbies, so a lobby never says where anyone is. Creating or joining one
 * needs you at a POI; once in, you can walk off and still enter when it starts.
 *
 * A lobby counts down, like a Pokémon raid lobby, and starts when the timer
 * runs out or the host starts it early. For now each player who enters gets
 * their own solo Run against the boss; shared multiplayer Runs come later.
 */
import type { GeoPoint } from "./distance";

/** PLACEHOLDER: how long a new lobby waits before it starts by itself. */
export const GEO_DUNGEON_LOBBY_SECONDS = 180;

/** PLACEHOLDER: once a lobby starts, how long its players have to enter. */
export const GEO_DUNGEON_ENTER_SECONDS = 300;

/** A dungeon as the lobby menu shows it: one per kind of dungeon. */
export type GeoDungeon = {
    id: string;
    name: string;
    description: string;
    /** The boss's name and the app's sprite for it. */
    bossName: string;
    bossSprite: string;
    /** The lowest combat level a lobby for it can ask for. */
    minCombatLevel: number;
    maxPlayers: number;
};

/**
 * - `open`: counting down; others can join.
 * - `started`: its players can enter until `secondsLeft` runs out.
 */
export type GeoDungeonLobbyPhase = "open" | "started";

export type GeoDungeonLobbyMember = {
    displayName: string;
    isHost: boolean;
    /** The player asking. */
    isYou: boolean;
    /** Has entered the dungeon (started only). */
    hasEntered: boolean;
};

export type GeoDungeonLobby = {
    id: string;
    dungeonId: string;
    hostName: string;
    /** The combat level needed to join. */
    requiredLevel: number;
    playerCount: number;
    maxPlayers: number;
    phase: GeoDungeonLobbyPhase;
    /**
     * Seconds until it starts (`open`), or until entering closes (`started`),
     * as of the reply. Counted down by the app from when the reply arrives,
     * so phone clocks never matter.
     */
    secondsLeft: number;
    /** Only filled in for the player's own lobby. */
    members?: GeoDungeonLobbyMember[];
};

/**
 * `GET /geo/dungeons`: every dungeon, the open lobbies (soonest to start
 * first, the player's own left out), and the player's own lobby, if any.
 */
export type GeoDungeonsResponse = {
    dungeons: GeoDungeon[];
    lobbies: GeoDungeonLobby[];
    myLobby: GeoDungeonLobby | null;
    /** The player's combat level, for "can I join this". */
    combatLevel: number;
};

/**
 * Proof the player is at a POI: where they are, and the POI's marker. The
 * server checks the two are within GEO_PLACE_REACH_METRES.
 */
export type GeoDungeonEntrance = {
    position: GeoPoint;
    place: GeoPoint;
};

/** `POST /geo/dungeons/lobbies`: replies 201 with the new lobby as `myLobby`. */
export type GeoCreateDungeonLobbyRequest = GeoDungeonEntrance & {
    dungeonId: string;
    /** From the dungeon's minCombatLevel up to the host's own combat level. */
    requiredLevel: number;
};

/** `POST /geo/dungeons/lobbies/:lobbyId/join`. */
export type GeoJoinDungeonLobbyRequest = GeoDungeonEntrance;
