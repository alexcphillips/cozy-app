import { useEffect, useState } from "react";
import type { Book } from "@cozy/shared";
import { useDebounce } from "@/hooks/useDebounce";
import { toErrorMessage } from "@/lib/api";
import { booksApi } from "../api/books.api";

/** Titles that indicate a boxed set rather than a single book. */
const BOXED_SET_TITLES = [
    "collection set",
    "book collection",
    "book boxed set",
];

/**
 * Owns the Discover search: query, debounce, paging, and request lifecycle.
 *
 * Called from the Library page rather than the Discover tab so that switching
 * tabs doesn't throw away an in-progress search.
 */
export function useBookSearch() {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 500);
    const [books, setBooks] = useState<Book[]>([]);
    const [page, setPage] = useState(0);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchTerm = debouncedQuery.trim();

    // Reset to the first page whenever the search term itself changes,
    // otherwise a new search inherits the previous search's page offset.
    useEffect(() => {
        setPage(0);
    }, [searchTerm]);

    // Searches run on the DEBOUNCED term, so this depends on that and the page
    // — never on `query`, which changes on every keystroke.
    useEffect(() => {
        if (!searchTerm) {
            setBooks([]);
            setHasNextPage(false);
            setError(null);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        async function loadBooks() {
            try {
                const data = await booksApi.search(searchTerm, page);
                if (cancelled) return;

                setBooks(
                    data.books.filter((book) => {
                        const title = book.volumeInfo.title.toLowerCase();
                        return !BOXED_SET_TITLES.some((phrase) =>
                            title.includes(phrase),
                        );
                    }),
                );
                setHasNextPage(data.nextPageExists);
                setError(null);
            } catch (err) {
                if (!cancelled) setError(toErrorMessage(err));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        loadBooks();

        return () => {
            cancelled = true;
        };
    }, [searchTerm, page]);

    function nextPage() {
        if (hasNextPage) setPage((current) => current + 1);
    }

    function previousPage() {
        setPage((current) => Math.max(0, current - 1));
    }

    return {
        query,
        setQuery,
        /** True once the user has typed something worth searching for. */
        hasSearched: Boolean(searchTerm),
        books,
        page,
        hasNextPage,
        hasPreviousPage: page > 0,
        nextPage,
        previousPage,
        isLoading,
        error,
    };
}
