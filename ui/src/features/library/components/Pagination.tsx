import styles from "./Pagination.module.css";

type PaginationProps = {
    page: number;
    hasPrevious: boolean;
    hasNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    isLoading?: boolean;
};

/**
 * The search API reports only "is there a next page", so this shows the
 * current page rather than "page X of Y".
 */
export default function Pagination({
    page,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    isLoading = false,
}: PaginationProps) {
    return (
        <nav className={styles["pagination"]} aria-label="Search results pages">
            <button
                type="button"
                className={styles["page-button"]}
                onClick={onPrevious}
                disabled={!hasPrevious || isLoading}
            >
                ← prev
            </button>

            <span className={styles["page-indicator"]} aria-live="polite">
                page {page + 1}
            </span>

            <button
                type="button"
                className={styles["page-button"]}
                onClick={onNext}
                disabled={!hasNext || isLoading}
            >
                next →
            </button>
        </nav>
    );
}
