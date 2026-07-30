import { api } from "@/lib/api";
import { API_PATHS, type RecordedAnalyticsEvent } from "@cozy/shared";

export const adminApi = {
    getAnalyticsEvents(startDate: string, endDate: string, userId?: string) {
        return api.get<RecordedAnalyticsEvent[]>(API_PATHS.analytics.events, {
            startDate,
            endDate,
            userId: userId || undefined,
        });
    },
};
