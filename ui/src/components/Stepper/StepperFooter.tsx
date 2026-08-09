import styles from "./StepperFooter.module.css";

type StepperFooterProps = {
    onCancel: () => void;
    onPrevious: () => void;
    onNext: () => void;
    previousDisabled: boolean;
    nextLabel: string;
    isLoading: boolean;
};

export default function StepperFooter({
    onCancel,
    onPrevious,
    onNext,
    previousDisabled,
    nextLabel,
    isLoading,
}: StepperFooterProps) {
    return (
        <div className={styles["footer"]}>
            <button type="button" onClick={onCancel} disabled={isLoading}>
                cancel
            </button>

            <button
                type="button"
                onClick={onPrevious}
                disabled={isLoading || previousDisabled}
            >
                previous
            </button>

            <button
                type="button"
                className={styles["footer-button"]}
                disabled={isLoading}
                onClick={onNext}
            >
                {isLoading ? "loading..." : nextLabel}
            </button>
        </div>
    );
}
