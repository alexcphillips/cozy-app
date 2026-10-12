import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Drawer.module.css";
import BackdropOverlay from "../BackdropOverlay/BackdropOverlay";
import DefaultDismissButton from "./DefaultDismissButton";
import { useBodyScrollLock } from "./useBodyScrollLock";
import { useFocusTrap } from "./useFocusTrap";

export type DrawerProps = {
    /**
     * Accessible name for the dialog. Keep it in sync with the title rendered
     * in `header`.
     */
    title: string;
    /**
     * Called by the backdrop, the dismiss button, and Escape. Render the drawer
     * conditionally and let unmounting reset its state.
     */
    onClose: () => void;
    header: ReactNode;
    footer: ReactNode;
    children: ReactNode;
    /** Escape hatches — the defaults are already wired to `onClose`. */
    backdrop?: ReactNode;
    dismissButton?: ReactNode;
};

export default function Drawer({
    title,
    onClose,
    header,
    footer,
    children,
    backdrop,
    dismissButton,
}: DrawerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useBodyScrollLock();
    useFocusTrap(containerRef, onClose);

    // Portalled to the body so an ancestor with a transform/filter can't become
    // the containing block for our `position: fixed`.
    return createPortal(
        <>
            {backdrop ?? <BackdropOverlay onClose={onClose} />}
            <div
                ref={containerRef}
                className={styles["drawer-container"]}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
            >
                <div className={styles["drawer-header-section"]}>
                    {header}
                    {dismissButton ?? (
                        <DefaultDismissButton onClose={onClose} />
                    )}
                </div>
                <div className={styles["drawer-content"]}>{children}</div>
                {footer}
            </div>
        </>,
        document.body,
    );
}
