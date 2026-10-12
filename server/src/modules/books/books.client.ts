import type { Book } from "@cozy/shared";
import { BOOKS } from "../../config/constants";
import { ENV } from "../../config/env";

/** Google returns this even though `Book` (what the UI renders) doesn't need it. */
type GoogleBooksVolume = Book & {
    volumeInfo: Book["volumeInfo"] & { language?: string };
};

type GoogleBooksResponse = {
    items?: GoogleBooksVolume[];
    totalItems?: number;
};

/**
 * `langRestrict` on the request is a soft hint, not a hard filter - Google
 * still returns non-English volumes through it. The volume's own `language`
 * field is reliable, so check that instead.
 */
function isEnglish(book: GoogleBooksVolume): boolean {
    return book.volumeInfo.language === "en";
}

/**
 * `intitle:`/`inauthor:` do fuzzy token matching, not phrase matching, so
 * quoting the term doesn't stop Google from returning volumes where it only
 * loosely relates (e.g. buried in a huge reference work's index). Requiring
 * the term to actually appear in the title or an author name weeds those out.
 */
function matchesSearchTerm(book: GoogleBooksVolume, searchTerm: string): boolean {
    const term = searchTerm.toLowerCase();
    const title = book.volumeInfo.title?.toLowerCase() ?? "";
    const authors = book.volumeInfo.authors?.join(" ").toLowerCase() ?? "";

    return title.includes(term) || authors.includes(term);
}

/**
 * Institutional reports, papers, and reference-work entries are rarely given
 * cover art on Google Books, whereas real trade books almost always have one.
 * A missing thumbnail is a decent proxy for "not actually a book".
 */
function hasCoverImage(book: GoogleBooksVolume): boolean {
    return Boolean(book.volumeInfo.imageLinks?.thumbnail);
}

/**
 * The only place that knows the Google Books URL shape. Isolated from the
 * controller so the upstream API can be swapped or cached without touching HTTP
 * handling - and so the API key never leaks into a route file.
 */
function buildSearchUrl(searchTerm: string, page: number): string {
    const url = new URL(BOOKS.API_BASE_URL);

    url.searchParams.set(
        "q",
        `(intitle:"${searchTerm}" OR inauthor:"${searchTerm}")`,
    );
    url.searchParams.set("key", ENV.GOOGLE_API_KEY);
    url.searchParams.set("maxResults", String(BOOKS.RESULTS_PER_PAGE));
    url.searchParams.set("startIndex", String(page * BOOKS.RESULTS_PER_PAGE));
    url.searchParams.set("printType", "books");
    url.searchParams.set("langRestrict", "en");

    return url.toString();
}

export async function searchBooks(
    searchTerm: string,
    page: number,
): Promise<{ books: Book[]; totalItems: number }> {
    const response = await fetch(buildSearchUrl(searchTerm, page));

    if (!response.ok) {
        throw new Error(`Google Books responded ${response.status}`);
    }

    const data = (await response.json()) as GoogleBooksResponse;

    const books = (data.items ?? []).filter(
        (book) =>
            isEnglish(book) &&
            matchesSearchTerm(book, searchTerm) &&
            hasCoverImage(book),
    );

    return { books, totalItems: data.totalItems ?? 0 };
}
