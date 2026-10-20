import type { GeoRewards, GeoRunStatus } from "@cozy/shared/geo";
import type { BattleState } from "../../engine/engine.types";

export type RunRow = {
    id: string;
    player_id: string;
    /**
     * Fishing Runs share the table (`modules/fishing`) with their own state;
     * code that may meet one checks `kind` as a string first.
     */
    kind: "combat";
    status: GeoRunStatus;
    enemy_ids: string[];
    /** The spawn being fought; null for dev fights started by enemy id. */
    spawn_id: string | null;
    state: BattleState;
    rewards: GeoRewards | null;
    /** BIGINT arrives as a string. */
    coins_lost: string | null;
    /** Fought at full health, leaving the player's own as it was (a dungeon's). */
    keeps_health: boolean;
    /** The dungeon this is the boss fight of; null for any other Run. */
    dungeon_id: string | null;
    /** The dungeon run this is a room fight of, and the room; null outside dungeon maps. */
    dungeon_run_id: string | null;
    dungeon_room: number | null;
};
