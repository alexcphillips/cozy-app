/** The subset of a Google Books volume this app actually renders. */
export type Book = {
    /**
     * Google's volume id. The stable identity for a book across searches, and
     * what `book.google_volume_id` stores - titles are not unique enough to key
     * a reading log by.
     */
    id: string;
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

export type BookSearchQuery = {
    /** Free-text title/author search. */
    q: string;
    /** Zero-based page index; the server pages in blocks of 40. */
    page?: number;
};

export type BookSearchResponse = {
    books: Book[];
    totalItems: number;
    nextPageExists: boolean;
};

/* ------------------------------------------------------------- library -- */

/**
 * Where a book sits in your reading workflow.
 * - `tbr` saved but not started
 * - `reading` in progress
 * - `finished` completed
 * - `dnf` started and abandoned, kept so "finished" counts stay honest
 */
export type ReadingStatus = "tbr" | "reading" | "finished" | "dnf";

export const READING_STATUSES: readonly ReadingStatus[] = [
    "tbr",
    "reading",
    "finished",
    "dnf",
];

/**
 * How a book's progress is measured. Page numbers only exist for physical and
 * fixed-layout books; ebooks report percent and audiobooks report time, so the
 * unit travels with the reading instance rather than being assumed.
 */
export type ProgressUnit = "page" | "percent" | "minute";

export const PROGRESS_UNITS: readonly ProgressUnit[] = [
    "page",
    "percent",
    "minute",
];

/**
 * One book on a user's shelf - really one *reading instance* of it, so a
 * re-read is a separate entry with its own log rather than overwriting the
 * first read's history.
 */
export type LibraryBook = {
    /** The reading instance id. This is what progress is logged against. */
    id: string;
    bookId: string;
    googleVolumeId: string;
    title: string;
    authors: string[];
    thumbnailUrl: string | null;
    pageCount: number | null;
    status: ReadingStatus;
    progressUnit: ProgressUnit;
    startedOn: string | null;
    finishedOn: string | null;
    /** Most recent logged position, or null if nothing has been logged yet. */
    latestProgress: number | null;
    latestLogDate: string | null;
    /**
     * Average progress per calendar day across the whole logged span, so days
     * you didn't read still count - that is what makes a finish-date estimate
     * realistic. Null until there are at least two logs on different days.
     */
    pacePerDay: number | null;
};

export type AddBookToLibraryRequest = {
    book: Book;
    /** Defaults to `tbr`. */
    status?: ReadingStatus;
    progressUnit?: ProgressUnit;
};

export type UpdateReadingStatusRequest = {
    status: ReadingStatus;
    /** Required when moving to `reading` or `finished`, to stamp the date. */
    localDate?: string;
};

/**
 * Logs the position you reached, not the pages you read. Absolute position is
 * easier to report accurately and pages-read is derivable by diffing, which
 * also makes re-logging the same day idempotent.
 */
export type LogReadingProgressRequest = {
    progressValue: number;
    localDate: string;
};
