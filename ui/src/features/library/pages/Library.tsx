import { useEffect, useState } from "react";
import styles from "./Library.module.css";
import type { Book } from "@cozy/shared";
import { useDebounce } from "../../../hooks/useDebounce";
import { toErrorMessage } from "../../../lib/api";
import { booksApi } from "../api/books.api";

/** Titles that indicate a boxed set rather than a single book. */
const BOXED_SET_TITLES = ["collection set", "book collection", "book boxed set"];

export default function Library() {
    const [bookQuery, setBookQuery] = useState("");
    const debouncedSearchTerm = useDebounce(bookQuery, 500);
    const [booksResult, setBooksResult] = useState<Book[]>([]);
    const [paginationPage, setPaginationPage] = useState(0);
    const [doesNextPageExist, setDoesNextPageExist] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Search runs on the DEBOUNCED term, so the effect depends on that and on
    // the page - never on `bookQuery`, which changes on every keystroke.
    useEffect(() => {
        const searchTerm = debouncedSearchTerm.trim();

        if (!searchTerm) return;

        let cancelled = false;

        async function loadBooks() {
            try {
                const data = await booksApi.search(searchTerm, paginationPage);

                if (cancelled) return;

                // Boxed sets and omnibuses crowd out the actual books.
                const results = data.books.filter((book) => {
                    const title = book.volumeInfo.title.toLowerCase();
                    return !BOXED_SET_TITLES.some((phrase) =>
                        title.includes(phrase),
                    );
                });

                setDoesNextPageExist(data.nextPageExists);
                setBooksResult(results);
                setSearchError(null);
            } catch (err) {
                if (!cancelled) setSearchError(toErrorMessage(err));
            }
        }

        loadBooks();

        // A slower earlier request must not overwrite a newer one's results.
        return () => {
            cancelled = true;
        };
    }, [debouncedSearchTerm, paginationPage]);

    function handleNextPage() {
        if (doesNextPageExist) setPaginationPage((s) => s + 1);
    }

    return (
        <div className={styles["library-container"]}>
            <div className={styles["actions-container"]}>
                <input
                    className={styles["book-search-input"]}
                    placeholder="Search..."
                    value={bookQuery}
                    onChange={(e) => setBookQuery(e.target.value)}
                />

                <div className={styles["pagination-actions"]}>
                    <button onClick={() => setPaginationPage((s) => s - 1)}>
                        prev
                    </button>
                    {paginationPage}
                    <button onClick={() => handleNextPage()}>next</button>
                </div>
            </div>

            {searchError && <p>{searchError}</p>}

            <div className={styles["books-section"]}>
                {booksResult.map((book, index) => {
                    return (
                        <div
                            className={styles["book"]}
                            key={`${book.volumeInfo.title}-${index}`}
                        >
                            <div className={styles["top-section"]}>
                                <div className={styles["title"]}>
                                    {book.volumeInfo?.title}
                                </div>
                            </div>

                            <div className={styles["author-section"]}>
                                <div className={styles["author"]}>
                                    {book.volumeInfo?.authors.join(", ")}
                                </div>
                            </div>

                            {/* <div className={styles["genre-section"]}>
                                <div className={styles["genre"]}>
                                    {book.volumeInfo?.categories}
                                </div>
                            </div> */}

                            <div className={styles["image-section"]}>
                                {book.volumeInfo?.imageLinks?.thumbnail && (
                                    <img
                                        className={styles["book-image"]}
                                        src={
                                            book.volumeInfo?.imageLinks
                                                ?.thumbnail
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
