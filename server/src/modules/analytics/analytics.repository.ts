import type { AnalyticsEvent } from "@cozy/shared";
import { query } from "../../db";
import { INSERT_ANALYTICS_EVENT, GET_ANALYTICS_EVENTS } from "./analytics.sql";
import type { AnalyticsEventRow } from "./analytics.types";

export async function getAnalyticsEvents(
    startDate: string,
    endDate: string,
    userId?: number,
    event?: string,
): Promise<AnalyticsEventRow[]> {
    return await query<AnalyticsEventRow>(GET_ANALYTICS_EVENTS, [
        startDate,
        endDate,
        userId ?? null,
        event ?? null,
    ]);
}

export async function insertAnalyticsEvent(
    userId: number,
    eventName: AnalyticsEvent["name"],
    properties: Record<string, unknown> | null,
): Promise<AnalyticsEventRow> {
    const rows = await query<AnalyticsEventRow>(INSERT_ANALYTICS_EVENT, [
        userId,
        eventName,
        properties,
    ]);

    const row = rows[0];
    if (!row) {
        throw new Error("INSERT_ANALYTICS_EVENT failed to return a row.");
    }

    return row;
}
