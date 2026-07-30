import { useState } from "react";
import styles from "./TabsCard.module.css";
import Tab from "../Tab/Tab";

export type TabConfig = {
    id: string;
    label: string;
    content: React.ReactNode;
};

type TabsCardProps = {
    title: string;
    tabs: TabConfig[];
    defaultTab: string;
};

export default function TabsCard({ title, tabs, defaultTab }: TabsCardProps) {
    const [activeTabId, setActiveTabId] = useState<string>(defaultTab);

    const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

    return (
        <div className={styles["card-container"]}>
            <header className={styles["card-header"]}>
                <h1>{title}</h1>
            </header>

            <div className={styles["tabs-container"]}>
                {tabs.map((tab) => (
                    <Tab
                        key={tab.id}
                        title={tab.label}
                        isActive={tab.id === activeTabId}
                        handleClick={() => setActiveTabId(tab.id)}
                    />
                ))}
            </div>

            <div className={styles["active-content"]}>{activeTab?.content}</div>
        </div>
    );
}
