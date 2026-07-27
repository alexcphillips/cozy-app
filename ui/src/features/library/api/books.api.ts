import { API_PATHS, type BookSearchResponse } from "@cozy/shared";
import { api } from "../../../lib/api";

/** Every book endpoint this feature can reach. Nothing else calls them. */
export const booksApi = {
    search(searchTerm: string, page = 0): Promise<BookSearchResponse> {
        return api.get<BookSearchResponse>(API_PATHS.books.search, {
            q: searchTerm,
            page,
        });
    },
};
