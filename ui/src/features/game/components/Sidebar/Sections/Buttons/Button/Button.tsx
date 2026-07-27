import type { ReactNode } from "react";
import styles from "./Button.module.css";

export type SidebarButtonProps = {
    icon: ReactNode;
    onClick: () => void;
};

export default function SidebarButton({ icon, onClick }: SidebarButtonProps) {
    return (
        <button className={styles["sidebar-button"]} onClick={onClick}>
            {icon}
        </button>
    );
}
