import { useState } from "react";
import { useAnalyticsData } from "../../../hooks/useAnalyticsData";
import Table, { type Column } from "@/components/Table/Table";
import styles from "./AnalyticsTab.module.css";

type BaseRecordedEvent = {
    id: number;
    user_id: number;
    created_at: string;
    event_name: string;
    properties?: Record<string, any>;
};

export default function AnalyticsTab() {
    const [dates] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        return {
            startDate: start.toISOString().substring(0, 10),
            endDate: end.toISOString().substring(0, 10),
        };
    });

    const [userIdValue, setUserIdValue] = useState("");
    const [eventValue, setEventValue] = useState("");

    const { data, loading, error } = useAnalyticsData({
        dates,
        userId: userIdValue || undefined,
        event: eventValue || undefined,
    });

    const columns: Column<BaseRecordedEvent>[] = [
        {
            key: "id",
            label: "Event ID",
            sortable: true,
        },
        {
            key: "user_id",
            label: "User ID",
            sortable: true,
        },
        {
            key: "event_name",
            label: "Event Type",
            sortable: true,
            render: (row) => (
                <span
                    className={`${styles["event-badge"]} ${styles[`badge-${row.event_name}`] || ""}`}
                >
                    {row.event_name}
                </span>
            ),
        },
        {
            key: "properties",
            label: "Metadata / Parameters",
            render: (row) =>
                row.properties ? (
                    <code className={styles["properties-code"]}>
                        {JSON.stringify(row.properties)}
                    </code>
                ) : (
                    <span className={styles["empty-text"]}>—</span>
                ),
        },
        {
            key: "created_at",
            label: "Logged Timestamp",
            sortable: true,
            render: (row) =>
                new Date(row.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                }),
        },
    ];

    if (error) return <div className={styles["error-banner"]}>{error}</div>;

    return (
        <div className={styles["tab-container"]}>
            <div className={styles["filters-row"]}>
                <div className={styles["input-group"]}>
                    <label htmlFor="user-filter">User ID:</label>
                    <input
                        id="user-filter"
                        type="number"
                        placeholder="All Users"
                        value={userIdValue}
                        onChange={(e) => setUserIdValue(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                    />
                </div>

                <div className={styles["input-group"]}>
                    <label htmlFor="event-filter">Event Name:</label>
                    <select
                        id="event-filter"
                        value={eventValue}
                        onChange={(e) => setEventValue(e.target.value)}
                    >
                        <option value="">All Events</option>
                        <option value="page_viewed">Page Views</option>
                        <option value="search_performed">Searches</option>
                        <option value="login">Logins</option>
                        <option value="register">Registrations</option>
                    </select>
                </div>

                <div className={styles["input-group"]}>
                    <label htmlFor="start-date-input">Start Date:</label>
                    <input
                        id="start-date-input"
                        type="date"
                        value={dates.startDate}
                        readOnly
                    />
                </div>

                <div className={styles["input-group"]}>
                    <label htmlFor="end-date-input">End Date:</label>
                    <input
                        id="end-date-input"
                        type="date"
                        value={dates.endDate}
                        readOnly
                    />
                </div>
            </div>

            <div className={styles["content-body-table"]}>
                {loading ? (
                    <div className={styles["loading-spinner"]}>
                        Syncing metric timeline...
                    </div>
                ) : !data || data.length === 0 ? (
                    <div className={styles["empty-state"]}>
                        No events found matching those parameters over this
                        timeline.
                    </div>
                ) : (
                    <Table
                        data={data as unknown as BaseRecordedEvent[]}
                        columns={columns}
                    />
                )}
            </div>
        </div>
    );
}
