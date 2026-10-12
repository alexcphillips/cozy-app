import {
    API_PATHS,
    buildPath,
    type AddBookToLibraryRequest,
    type Book,
    type BookSearchResponse,
    type LibraryBook,
    type LogReadingProgressRequest,
    type ReadingStatus,
    type UpdateReadingStatusRequest,
} from "@cozy/shared";
import { api } from "../../../lib/api";
import { getLocalDateString } from "@/utils/getLocalDateString";

/**
 * Every book endpoint this feature can reach. Nothing else calls them.
 *
 * The three mutations all return the whole shelf rather than the changed row:
 * status and progress both feed derived fields (pace, latest progress), so a
 * partial response would leave the client recomputing what the server already
 * knows.
 */
export const booksApi = {
    search(searchTerm: string, page = 0): Promise<BookSearchResponse> {
        return api.get<BookSearchResponse>(API_PATHS.books.search, {
            q: searchTerm,
            page,
        });
    },

    listLibrary(): Promise<LibraryBook[]> {
        return api.get<LibraryBook[]>(API_PATHS.books.library);
    },

    addToLibrary(book: Book, status?: ReadingStatus): Promise<LibraryBook[]> {
        const body: AddBookToLibraryRequest = { book, status };
        return api.post<LibraryBook[]>(API_PATHS.books.library, body);
    },

    updateStatus(
        instanceId: string,
        status: ReadingStatus,
    ): Promise<LibraryBook[]> {
        const body: UpdateReadingStatusRequest = {
            status,
            localDate: getLocalDateString(),
        };

        return api.patch<LibraryBook[]>(
            buildPath(API_PATHS.books.libraryItem, { instanceId }),
            body,
        );
    },

    logProgress(
        instanceId: string,
        progressValue: number,
    ): Promise<LibraryBook[]> {
        const body: LogReadingProgressRequest = {
            progressValue,
            localDate: getLocalDateString(),
        };

        return api.post<LibraryBook[]>(
            buildPath(API_PATHS.books.libraryItemProgress, { instanceId }),
            body,
        );
    },
};
