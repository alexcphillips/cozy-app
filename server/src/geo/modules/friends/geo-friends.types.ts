import type { GeoActivity } from "@cozy/shared/geo";

export type PairRow = {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: "pending" | "accepted";
};

export type FriendRow = {
    id: string;
    name: string;
    accepted_at: Date;
    last_seen_at: Date | null;
    activity: GeoActivity | null;
    activity_skill: string | null;
    online: boolean;
    fighting: boolean;
};

export type RequestRow = {
    id: string;
    outgoing: boolean;
    player_id: string;
    name: string;
    created_at: Date;
};
