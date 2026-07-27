import type { ReactNode } from "react";
import styles from "./Drawer.module.css";
import { IoClose } from "react-icons/io5";

export type DrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    drawerTitle: string;
    formId?: string;
    isLoading?: boolean;
};

export default function Drawer({
    isOpen,
    onClose,
    children,
    drawerTitle,
    formId,
    isLoading = false,
}: DrawerProps) {
    if (!isOpen) return null;

    return (
        <div className={styles["drawer-container"]}>
            <div className={styles["drawer-header-section"]}>
                <div className={styles["drawer-title"]}>{drawerTitle}</div>
                <button
                    className={styles["close-button"]}
                    onClick={onClose}
                    aria-label="Close drawer"
                >
                    <IoClose />
                </button>
            </div>

            <div className={styles["drawer-content"]}>{children}</div>

            <div className={styles["drawer-footer"]}>
                <button
                    type="button"
                    className={styles["footer-button"]}
                    onClick={onClose}
                    disabled={isLoading}
                >
                    cancel
                </button>

                <button
                    type="submit"
                    form={formId}
                    className={styles["footer-button"]}
                    disabled={isLoading}
                >
                    {isLoading ? "saving..." : "submit"}
                </button>
            </div>
        </div>
    );
}
