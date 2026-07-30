// import { useState } from "react";
// import { useAnalyticsData } from "../../hooks/useAnalyticsData";
// import TabsCard from "@/components/TabsCard/TabsCard";
import styles from "./AdminDashboard.module.css";

// const TAB_CONFIG = [
//     { id: "analytics", title: "Analytics", Component: AnalyticsTabContent },
//     {
//         title: "Manage Users",
//         Component: ManageUsersTab,
//     },
// ];

export default function AdminDashboard() {
    return (
        <div className={styles["dashboard-container"]}>
            <header className={styles["dashboard-header"]}>
                <h1>ABCDEF</h1>
            </header>

            {/* <TabsCard
                cardTitle="Analytics Overview"
                tabs={TAB_CONFIG}
                defaultTab="sales"
            /> */}
        </div>
    );
}
