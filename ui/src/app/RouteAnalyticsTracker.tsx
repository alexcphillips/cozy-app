import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function RouteAnalyticsTracker() {
    const location = useLocation();
    const { track } = useAnalytics();

    useEffect(() => {
        // The hook automatically injects 'path', we just append the query string details
        track("page_viewed", {
            search: location.search,
        });
    }, [location.pathname, location.search, track]);

    return null;
}
