import { useCallback } from "react";
import { sendAnalyticsEvent } from "@/lib/analytics";
import type { AnalyticsEvent } from "@cozy/shared";
import { useLocation } from "react-router-dom";

export function useAnalytics() {
    const location = useLocation();

    const track = useCallback(
        (
            name: AnalyticsEvent["name"],
            customProperties: Record<string, unknown> | null = null,
        ) => {
            const properties = {
                path: location.pathname,
                ...customProperties,
            };

            sendAnalyticsEvent({
                name,
                properties,
            } as AnalyticsEvent);
        },
        [location.pathname],
    );

    return { track };
}
