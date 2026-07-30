import { api } from "@/lib/api";
import { API_PATHS, type RecordedAnalyticsEvent } from "@cozy/shared";
import { useEffect, useState } from "react";

export function useAnalyticsData(params: {
    dates: { startDate: string; endDate: string };
    userId?: string;
    event?: string;
}) {
    const [data, setData] = useState<RecordedAnalyticsEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        const fetchAnalytics = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await api.get<RecordedAnalyticsEvent[]>(
                    API_PATHS.analytics.events,
                    {
                        startDate: params.dates.startDate,
                        endDate: params.dates.endDate,
                        userId: params.userId,
                        event: params.event,
                    },
                );

                // Only update state if this remains the most recent request
                if (active) {
                    setData(result);
                }
            } catch (err) {
                console.error(err);
                if (active) {
                    setError("Failed to fetch analytics");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchAnalytics();

        // Cleanup function cancels state updates if params change mid-flight
        return () => {
            active = false;
        };
    }, [
        params.dates.startDate,
        params.dates.endDate,
        params.userId,
        params.event,
    ]);

    return { data, loading, error };
}
