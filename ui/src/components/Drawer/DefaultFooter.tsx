import styles from "./DefaultFooter.module.css";

export type DefaultFooterProps = {
    onClose: () => void;
    formId?: string;
    isLoading?: boolean;
};

export function DefaultFooter({
    onClose,
    isLoading = false,
    formId,
}: DefaultFooterProps) {
    return (
        <div className={styles["drawer-footer"]}>
            <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
            >
                cancel
            </button>

            <button
                type="submit"
                form={formId}
                disabled={isLoading}
            >
                {isLoading ? "saving..." : "submit"}
            </button>
        </div>
    );
}
