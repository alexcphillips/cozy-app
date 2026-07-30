import { sendAnalyticsEvent } from "@/lib/analytics";
import type { AnalyticsEvent } from "@cozy/shared";
import { useLocation } from "react-router-dom";

export function useAnalytics() {
    const location = useLocation();

    const track = (
        name: AnalyticsEvent["name"],
        customProperties: Record<string, unknown> | null = null,
    ) => {
        // Merge the automatic context with any custom properties passed in
        const properties = {
            path: location.pathname,
            ...customProperties,
        };

        sendAnalyticsEvent({
            name,
            properties,
        } as AnalyticsEvent);
    };

    return { track };
}
