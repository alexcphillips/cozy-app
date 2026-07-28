import type { Book } from "@cozy/shared";
import { BOOKS } from "../../config/constants";
import { ENV } from "../../config/env";

type GoogleBooksResponse = {
    items?: Book[];
    totalItems?: number;
};

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

    return { books: data.items ?? [], totalItems: data.totalItems ?? 0 };
}
