// import { useState } from "react";
// import { useAnalyticsData } from "../../hooks/useAnalyticsData";
// import styles from "./AnalyticsTab.module.css";

export default function AnalyticsTab() {
    // const [dates] = useState(() => {
    //     const end = new Date();
    //     const start = new Date();
    //     start.setDate(end.getDate() - 7);
    //     return {
    //         start: start.toISOString().split("T")[0] as string,
    //         end: end.toISOString().split("T")[0] as string,
    //     };
    // });
    // const [userIdValue, setUserIdValue] = useState("");
    // const [eventValue, setEventValue] = useState("");

    // const { data, loading, error } = useAnalyticsData({
    //     dates,
    //     userId: userIdValue,
    //     event: eventValue,
    // });

    // if (error) return <div className={styles["error-banner"]}>{error}</div>;

    return <div>I'm analytics tab content!</div>;
}
