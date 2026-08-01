import { useMemo } from "react";
import TabsCard from "@/components/TabsCard/TabsCard";
import AnalyticsTab from "./AnalyticsTab/AnalyticsTab";
import styles from "./AdminDashboard.module.css";
import ManageUsersTab from "./ManageUsersTab/ManageUsersTab";
import UtilitiesTab from "./UtilitiesTab/UtilitiesTab";

export default function AdminDashboard() {
    const tabsConfig = useMemo(() => {
        return [
            {
                id: "analytics",
                label: "Analytics",
                content: <AnalyticsTab />,
            },
            {
                id: "manage-users",
                label: "Manage Users",
                content: <ManageUsersTab />,
            },
            {
                id: "utilities",
                label: "Utilities",
                content: <UtilitiesTab />,
            },
        ];
    }, []);

    return (
        <div className={styles["dashboard-container"]}>
            <header className={styles["dashboard-header"]}>
                <h1>Hello, Admin!</h1>
            </header>
            <TabsCard title="" tabs={tabsConfig} defaultTab="analytics" />
        </div>
    );
}
