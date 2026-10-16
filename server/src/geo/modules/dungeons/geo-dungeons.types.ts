export type LobbyRow = {
    id: string;
    dungeon_id: string;
    host_id: string;
    host_name: string;
    required_level: number;
    max_players: number;
    starts_at: Date;
    started_at: Date | null;
    closed_at: Date | null;
    /** The database's clock when the row was read. */
    now: Date;
    player_count: number;
};

export type MemberRow = {
    player_id: string;
    display_name: string;
    has_entered: boolean;
};
