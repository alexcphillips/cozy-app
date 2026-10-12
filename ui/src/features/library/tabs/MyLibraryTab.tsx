import { useState } from "react";
import type { LibraryBook, ReadingStatus } from "@cozy/shared";
import { READING_STATUSES } from "@cozy/shared";
import styles from "./MyLibraryTab.module.css";
import BookGrid, { BookGridMessage } from "../components/BookGrid";
import BookCover from "../components/BookCover";
import { formatProgressOfTotal, STATUS_LABELS } from "../readingProgress";

type MyLibraryTabProps = {
    books: LibraryBook[];
    isLoading: boolean;
    pendingId: string | null;
    onSetStatus: (instanceId: string, status: ReadingStatus) => void;
};

type ShelfFilter = ReadingStatus | "all";

const FILTERS: ShelfFilter[] = ["all", ...READING_STATUSES];

const FILTER_LABELS: Record<ShelfFilter, string> = {
    all: "All",
    ...STATUS_LABELS,
};

export default function MyLibraryTab({
    books,
    isLoading,
    pendingId,
    onSetStatus,
}: MyLibraryTabProps) {
    const [filter, setFilter] = useState<ShelfFilter>("all");

    const visibleBooks =
        filter === "all"
            ? books
            : books.filter((book) => book.status === filter);

    function countFor(shelfFilter: ShelfFilter) {
        return shelfFilter === "all"
            ? books.length
            : books.filter((book) => book.status === shelfFilter).length;
    }

    if (isLoading) {
        return <BookGridMessage>loading your shelf...</BookGridMessage>;
    }

    return (
        <div className={styles["my-library"]}>
            <div className={styles["filter-row"]}>
                {FILTERS.map((shelfFilter) => (
                    <button
                        key={shelfFilter}
                        type="button"
                        className={`${styles["filter-chip"]} ${filter === shelfFilter ? styles["filter-chip-active"] : ""}`}
                        onClick={() => setFilter(shelfFilter)}
                        aria-pressed={filter === shelfFilter}
                    >
                        {FILTER_LABELS[shelfFilter]}
                        <span className={styles["filter-count"]}>
                            {countFor(shelfFilter)}
                        </span>
                    </button>
                ))}
            </div>

            {visibleBooks.length ? (
                <BookGrid>
                    {visibleBooks.map((book) => (
                        <div key={book.id} className={styles["shelf-tile"]}>
                            <BookCover
                                url={book.thumbnailUrl ?? undefined}
                                title={book.title}
                            />

                            <div className={styles["tile-meta"]}>
                                <p
                                    className={styles["tile-title"]}
                                    title={book.title}
                                >
                                    {book.title}
                                </p>
                                <p className={styles["tile-author"]}>
                                    {book.authors.join(", ") ||
                                        "Unknown author"}
                                </p>
                                <p className={styles["tile-progress"]}>
                                    {formatProgressOfTotal(book)}
                                </p>
                            </div>

                            <label className={styles["status-field"]}>
                                <span className={styles["visually-hidden"]}>
                                    Status for {book.title}
                                </span>
                                <select
                                    className={styles["status-select"]}
                                    value={book.status}
                                    disabled={pendingId === book.id}
                                    onChange={(e) =>
                                        onSetStatus(
                                            book.id,
                                            e.target.value as ReadingStatus,
                                        )
                                    }
                                >
                                    {READING_STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                            {STATUS_LABELS[status]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    ))}
                </BookGrid>
            ) : (
                <BookGridMessage>
                    {books.length
                        ? "Nothing on this shelf yet."
                        : "Your library is empty. Find something in Discover and add it."}
                </BookGridMessage>
            )}
        </div>
    );
}
