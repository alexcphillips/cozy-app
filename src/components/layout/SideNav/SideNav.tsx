import styles from "./SideNav.module.css";
import { sideNavItems } from "../../../config/sideNavData";
import type { SideNavItemType } from "./SideNavItem.model";
import SideNavItem from "./SideNavItem";
import { useState } from "react";
import { PiSidebarSimple } from "react-icons/pi";

export default function SideNav() {
    const [expand, setExpand] = useState(true);

    function handleToggleExpand() {
        return setExpand(!expand);
    }

    return (
        <div
            className={`${styles["sidenav-container"]} ${expand ? styles["expand"] : styles["collapse"]}`}
        >
            <div
                className={`${styles["toggle-expand-container"]} ${expand ? styles["end"] : styles["centered"]}`}
                onClick={handleToggleExpand}
            >
                <div className={styles["toggle-expand-button"]}>
                    <PiSidebarSimple />
                </div>
            </div>
            <div
                className={`${styles["nav-items"]} ${!expand ? styles["hidden"] : ""}`}
            >
                {sideNavItems.map((item: SideNavItemType, i) => {
                    return (
                        <SideNavItem item={item} key={`${item.label}:${i}`} />
                    );
                })}
            </div>
        </div>
    );
}
