import { useEffect, useState } from "react";
import styles from "./Library.module.css";
import { apiFetch } from "../../apiFetch";
import { useDebounce } from "../../game/hooks/useDebounce";

export type Book = {
    volumeInfo: {
        title: string;
        authors: string[];
        categories: string[];
        description: string;
        pageCount: number;
        averageRating?: number;
        ratingsCount?: number;
        imageLinks: {
            smallThumbnail: string;
            thumbnail: string;
        };
    };
};

export default function Library() {
    const [bookQuery, setBookQuery] = useState("");
    const debouncedSearchTerm = useDebounce(bookQuery, 500);
    const [booksResult, setBooksResult] = useState<Book[]>([]);
    const [paginationPage, setPaginationPage] = useState(0);
    const [doesNextPageExist, setDoesNextPageExist] = useState(false);

    async function loadBooks() {
        const response = await apiFetch(
            `api/book?q=${bookQuery || "beach+read"}&page=${paginationPage}`,
        );

        if (!response.ok) {
            return;
        }

        const data: { books: Book[]; doesNextPageExist: boolean } =
            await response.json();
        // Filtering out book sets
        const results = data.books.filter(
            (book) =>
                !book.volumeInfo.title
                    .toLowerCase()
                    .includes("collection set") &&
                !book.volumeInfo.title
                    .toLowerCase()
                    .includes("book collection") &&
                !book.volumeInfo.title.toLowerCase().includes("book boxed set"),
        );

        console.log("RESULTS:::", results);
        setDoesNextPageExist(data.doesNextPageExist);
        console.log("doesNextPageExist", doesNextPageExist);
        setBooksResult(results);
    }

    useEffect(() => {
        if (!bookQuery || bookQuery.trim() === "") return;
        loadBooks();
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
