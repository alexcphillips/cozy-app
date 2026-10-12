import type { ReactNode } from "react";
import styles from "./BookGrid.module.css";

type BookGridProps = {
    children: ReactNode;
};

/**
 * Responsive book grid. Column count comes from `auto-fill` + `minmax` rather
 * than breakpoints, so tiles keep a readable width at any container size
 * without a media query per step.
 */
export default function BookGrid({ children }: BookGridProps) {
    return <div className={styles["grid"]}>{children}</div>;
}

export function BookGridMessage({ children }: BookGridProps) {
    return <p className={styles["message"]}>{children}</p>;
}
