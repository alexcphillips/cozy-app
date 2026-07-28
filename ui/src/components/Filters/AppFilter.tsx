import type { ReactNode } from "react";
import styles from "./AppFilter.module.css";

export type AppFilterProps = {
    id: string;
    label: string;
    icon: ReactNode;
    isActive: boolean;
    onClick: () => void;
};

export default function AppFilter({
    label,
    icon,
    isActive,
    onClick,
}: AppFilterProps) {
    return (
        <div
            className={`${styles["filter-container"]} ${isActive ? styles["active"] : ""}`}
            onClick={onClick}
        >
            <div className={styles["filter-title"]}>{label}</div>
            <div className={styles["filter-icon"]}>{icon}</div>
        </div>
    );
}
