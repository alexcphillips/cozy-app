/** The subset of a Google Books volume this app actually renders. */
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
