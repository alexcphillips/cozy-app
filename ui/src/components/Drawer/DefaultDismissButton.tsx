import { IoClose } from "react-icons/io5";
import styles from "./DefaultDismissButton.module.css";
import type { ReactNode } from "react";

type DefaultDismissButtonProps = {
    onClose: () => void;
    icon?: ReactNode;
};

export default function DefaultDismissButton({
    onClose,
    icon,
}: DefaultDismissButtonProps) {
    return (
        <button
            className={styles["close-button"]}
            onClick={onClose}
            aria-label="Close drawer"
        >
            {icon ?? <IoClose />}
        </button>
    );
}
