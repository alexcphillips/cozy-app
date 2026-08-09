import { useEffect, type ReactNode } from "react";
import styles from "./Drawer.module.css";

export type DrawerProps = {
    isOpen: boolean;
    children: ReactNode;
    backdrop: ReactNode;
    dismissButton: ReactNode;
    footer: ReactNode;
    header: ReactNode;
};

export default function Drawer({
    isOpen,
    children,
    backdrop,
    dismissButton,
    header,
    footer,
}: DrawerProps) {
    useEffect(() => {
        if (!isOpen) return;

        document.body.classList.add("global-body-fixed");

        return () => {
            document.body.classList.remove("global-body-fixed");
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {backdrop}
            <div className={styles["drawer-container"]}>
                <div className={styles["drawer-header-section"]}>
                    {header}
                    {dismissButton}
                </div>
                <div className={styles["drawer-content"]}>{children}</div>
                {footer}
            </div>
        </>
    );
}
