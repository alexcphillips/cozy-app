import type { ReactNode } from "react";
import { IoClose } from "react-icons/io5";
import styles from "./Panel.module.css";
import { useUIStore } from "../../../stores/ui/ui.store";

export type PanelSize = "small" | "medium" | "large" | "fullscreen";

export type PanelProps = {
    children: ReactNode;
    size: PanelSize;
    title?: string;
};

export default function Panel({ children, size, title }: PanelProps) {
    const closeHotspot = useUIStore((s) => s.closePanel);

    return (
        <div className={`${styles.panel} ${styles[`panel-size-${size}`]}`}>
            <div className={styles["header-section"]}>
                {title}
                <button
                    className={styles["close-button"]}
                    onClick={() => closeHotspot()}
                >
                    <IoClose />
                </button>
            </div>

            <div className={styles["content"]}>{children}</div>
        </div>
    );
}
