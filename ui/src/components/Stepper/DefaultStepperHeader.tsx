import type { ReactNode } from "react";
import styles from "./DefaultStepperHeader.module.css";

export type DefaultStepperHeaderProps = {
    title: string;
    stepper: ReactNode;
};

export default function DefaultStepperHeader({
    title,
    stepper,
}: DefaultStepperHeaderProps) {
    return (
        <div className={styles["header"]}>
            <div className={styles["title"]}>{title}</div>
            <div className={styles["stepper-container"]}>{stepper}</div>
        </div>
    );
}
