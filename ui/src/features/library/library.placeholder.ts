import type { Book } from "@cozy/shared";

/**
 * PLACEHOLDER DATA — delete this file once the book-club endpoints exist.
 *
 * Discover, Me, and My Library all run on real data now. The book club does
 * not: there is no club table, membership, or discussion storage, so these
 * fixtures exist to let the tab be designed against realistic content. Covers
 * are intentionally blank to exercise `BookCover`'s fallback.
 */

function placeholderBook(
    id: string,
    title: string,
    authors: string[],
    categories: string[],
    pageCount: number,
): Book {
    return {
        id,
        volumeInfo: {
            title,
            authors,
            categories,
            description: "",
            pageCount,
            imageLinks: { smallThumbnail: "", thumbnail: "" },
        },
    };
}

export type BookClubPlaceholder = {
    currentRead: Book;
    meetsOn: string;
    members: string[];
    discussionPrompts: string[];
};

export const PLACEHOLDER_BOOK_CLUB: BookClubPlaceholder = {
    currentRead: placeholderBook(
        "placeholder-tomorrow",
        "Tomorrow, and Tomorrow, and Tomorrow",
        ["Gabrielle Zevin"],
        ["Fiction"],
        416,
    ),
    meetsOn: "Sundays at 7pm",
    members: ["Alex", "Sam", "Rowan", "Imani", "Theo"],
    discussionPrompts: [
        "Does Sadie get a fair shake from the narrative?",
        "Which game would you actually want to play?",
        "Is this a love story or a work story?",
    ],
};
