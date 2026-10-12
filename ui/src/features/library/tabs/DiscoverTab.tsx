import type { Book } from "@cozy/shared";
import styles from "./DiscoverTab.module.css";
import BookGrid, { BookGridMessage } from "../components/BookGrid";
import BookTile from "../components/BookTile";
import Pagination from "../components/Pagination";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import type { useBookSearch } from "../hooks/useBookSearch";

type DiscoverTabProps = {
    search: ReturnType<typeof useBookSearch>;
    /** Google volume ids already on the shelf. */
    savedVolumeIds: Set<string>;
    onAddToLibrary: (book: Book) => void;
};

export default function DiscoverTab({
    search,
    savedVolumeIds,
    onAddToLibrary,
}: DiscoverTabProps) {
    const {
        query,
        setQuery,
        hasSearched,
        books,
        page,
        hasNextPage,
        hasPreviousPage,
        nextPage,
        previousPage,
        isLoading,
        error,
    } = search;

    function renderResults() {
        if (error) return null;

        if (!hasSearched) {
            return (
                <BookGridMessage>
                    Search for a title or author to start building your shelf.
                </BookGridMessage>
            );
        }

        if (isLoading && !books.length) {
            return <BookGridMessage>looking for books...</BookGridMessage>;
        }

        if (!books.length) {
            return (
                <BookGridMessage>
                    No books matched that search. Try a different title or
                    author.
                </BookGridMessage>
            );
        }

        return (
            <BookGrid>
                {books.map((book) => (
                    <BookTile
                        key={book.id}
                        title={book.volumeInfo.title}
                        url={book.volumeInfo.imageLinks?.thumbnail}
                        author={book.volumeInfo.authors?.join(", ")}
                        isSaved={savedVolumeIds.has(book.id)}
                        onAddToLibrary={() => onAddToLibrary(book)}
                    />
                ))}
            </BookGrid>
        );
    }

    return (
        <div className={styles["discover"]}>
            <div className={styles["search-row"]}>
                <label className={styles["search-field"]}>
                    <span className={styles["search-icon"]} aria-hidden="true">
                        🔍
                    </span>
                    <input
                        className={styles["search-input"]}
                        type="search"
                        placeholder="Search by title or author..."
                        aria-label="Search books by title or author"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                    />
                </label>

                {hasSearched && !isLoading && books.length > 0 && (
                    <p className={styles["result-count"]}>
                        {books.length} {books.length === 1 ? "book" : "books"}{" "}
                        on this page
                    </p>
                )}
            </div>

            {error && <ErrorMessage message={error} />}

            <div
                className={`${styles["results"]} ${isLoading ? styles["results-loading"] : ""}`}
            >
                {renderResults()}
            </div>

            {hasSearched && !error && (hasPreviousPage || hasNextPage) && (
                <Pagination
                    page={page}
                    hasPrevious={hasPreviousPage}
                    hasNext={hasNextPage}
                    onPrevious={previousPage}
                    onNext={nextPage}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}
