import { NavLink } from "react-router-dom";
import type { SideNavItemType } from "./SideNavItem.model";
import styles from "./SideNavItem.module.css";
import { useState } from "react";

interface SideNavItemProps {
    item: SideNavItemType;
    depth?: number;
}

export default function SideNavItem({ item, depth = 0 }: SideNavItemProps) {
    const [isOpen, setOpen] = useState(() => {
        if (typeof window !== "undefined") {
            return window.innerWidth > 768;
        }
        return true;
    });
    const hasChildren = !!item.children?.length;

    const handleToggle = () => {
        if (hasChildren) setOpen(!isOpen);
    };

    return (
        <div
            className={styles["item-container"]}
            style={{ marginLeft: depth * 4 }}
        >
            <div className={styles["item-label"]} onClick={handleToggle}>
                <div className={styles["section-row"]}>
                    {hasChildren && (
                        <span className={styles["toggle-arrow"]}>
                            {isOpen ? "▾" : "▸"}
                        </span>
                    )}

                    {item.path && !hasChildren ? (
                        <NavLink
                            to={item.path}
                            className={({ isActive }) =>
                                isActive
                                    ? styles["active-link"]
                                    : styles["link"]
                            }
                        >
                            {item.label}
                        </NavLink>
                    ) : (
                        <span>{item.label}</span>
                    )}
                </div>

                {hasChildren && isOpen && (
                    <div className={styles["children-container"]}>
                        {item.children?.map((child) => (
                            <div
                                key={child.label}
                                className={styles["child-row"]}
                            >
                                <span className={styles["child-dot"]} />
                                <SideNavItem item={child} depth={depth + 1} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
