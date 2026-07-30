import type { AnalyticsEvent } from "@cozy/shared";

const ANALYTICS_EVENT_NAMES = [
    "register",
    "login",
    "logout",
    "page_viewed",
    "drawer_opened",
    "drawer_closed",
    "modal_opened",
    "modal_closed",
    "form_submitted",
    "search_performed",
    "pagination_next_page",
    "pagination_previous_page",
    "pagination_set_page_size",
    "table_row_created",
    "table_row_updated",
    "table_row_deleted",
] as const;

type EventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export default function validateAnalyticsRequest(
    value: unknown,
): value is AnalyticsEvent & { properties?: unknown } {
    if (!value || typeof value !== "object") {
        return false;
    }

    const event = value as Record<string, unknown>;

    if (
        typeof event.name !== "string" ||
        !ANALYTICS_EVENT_NAMES.includes(event.name as EventName)
    ) {
        return false;
    }

    if (
        "properties" in event &&
        event.properties !== null &&
        typeof event.properties !== "object"
    ) {
        return false;
    }

    return true;
}
