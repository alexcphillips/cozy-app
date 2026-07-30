import { API_PATHS, type AnalyticsEvent } from "@cozy/shared";
import { api } from "../api";

// When using this, let it resolve safely in the background without blocking the UI path
export async function sendAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
    try {
        await api.post(API_PATHS.analytics.event, event);
    } catch (error) {
        console.warn("Analytics event failed to dispatch safely:", error);
    }
}
