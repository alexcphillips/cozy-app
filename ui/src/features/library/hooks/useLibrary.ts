import { useCallback, useEffect, useState } from "react";
import type { Book, LibraryBook, ReadingStatus } from "@cozy/shared";
import { toErrorMessage } from "@/lib/api";
import { booksApi } from "../api/books.api";

/**
 * Owns the user's shelf and every mutation against it.
 *
 * Each mutation returns the full shelf from the server, so the local state is
 * replaced rather than patched - that keeps the derived fields (pace, latest
 * progress, promoted status) authoritative on the server instead of being
 * recomputed in two places.
 */
export function useLibrary() {
    const [books, setBooks] = useState<LibraryBook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    /** The reading-instance id currently being mutated, for per-card spinners. */
    const [pendingId, setPendingId] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;

        async function loadLibrary() {
            setIsLoading(true);
            try {
                const shelf = await booksApi.listLibrary();
                if (!ignore) {
                    setBooks(shelf);
                    setError("");
                }
            } catch (err) {
                if (!ignore) setError(toErrorMessage(err));
            } finally {
                if (!ignore) setIsLoading(false);
            }
        }

        loadLibrary();

        return () => {
            ignore = true;
        };
    }, []);

    const addBook = useCallback(async (book: Book) => {
        setError("");
        try {
            setBooks(await booksApi.addToLibrary(book));
        } catch (err) {
            setError(toErrorMessage(err));
        }
    }, []);

    const setStatus = useCallback(
        async (instanceId: string, status: ReadingStatus) => {
            setError("");
            setPendingId(instanceId);
            try {
                setBooks(await booksApi.updateStatus(instanceId, status));
            } catch (err) {
                setError(toErrorMessage(err));
            } finally {
                setPendingId(null);
            }
        },
        [],
    );

    const logProgress = useCallback(
        async (instanceId: string, progressValue: number) => {
            setError("");
            setPendingId(instanceId);
            try {
                setBooks(await booksApi.logProgress(instanceId, progressValue));
            } catch (err) {
                setError(toErrorMessage(err));
            } finally {
                setPendingId(null);
            }
        },
        [],
    );

    return {
        books,
        isLoading,
        error,
        pendingId,
        addBook,
        setStatus,
        logProgress,
        /** Google volume ids already on the shelf, for Discover's Saved state. */
        savedVolumeIds: new Set(books.map((book) => book.googleVolumeId)),
    };
}
