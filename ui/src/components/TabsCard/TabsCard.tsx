// import { useState } from "react";
import styles from "./TabsCard.module.css";
// import Tab from "../Tab/Tab";

type TabsCardProps = {
    defaultTab: string;
    tabs: TabConfig[];
    cardTitle: string;
};

export type TabConfig = {
    title: string;
};

export default function TabsCard(config: TabsCardProps) {
    // const [activeTabIndex, setActiveTabIndex] = useState(config.defaultTab);

    // function handleChangeTab(index: string) {
    // setActiveTabIndex(index);
    // }

    return (
        <div className={styles["card-container"]}>
            <h1>{config.cardTitle}</h1>
            <div className={styles["tabs-container"]}>
                {/* {config.tabs.map((tab, i) => (
                    <Tab
                        key={`${tab.title}-${i}`}
                        title={tab.title}
                        handleClick={() => handleChangeTab(i)}
                    />
                ))} */}
            </div>
            <div className={styles["active-content"]}>content here</div>
        </div>
    );
}
