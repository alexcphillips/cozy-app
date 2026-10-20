import type { GeoDungeonRunStatus } from "@cozy/shared/geo";
import type { DungeonMap } from "../../dungeons/dungeon-map";
import type { DungeonRunState } from "../../dungeons/dungeon-run";

export type DungeonRunRow = {
    id: string;
    player_id: string;
    dungeon_id: string;
    status: GeoDungeonRunStatus;
    /** The map as rolled at the start; never re-derived from the data files. */
    map: DungeonMap;
    state: DungeonRunState;
};
