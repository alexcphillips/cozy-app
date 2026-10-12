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
};
