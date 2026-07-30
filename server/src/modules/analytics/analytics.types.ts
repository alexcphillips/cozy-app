export type AnalyticsEventRow = {
    id: number;
    user_id: number;
    event_name: string;
    properties: Record<string, unknown> | null;
    created_at: string;
};
