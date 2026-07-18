import type { Request, Response } from "express";
import { APP_CONFIG } from "../app.config";

export type BookResponse = {
    kind: string;
};

export async function getBook(req: Request, res: Response) {
    const googleKey = APP_CONFIG.GOOGLE_API_KEY;

    const urlBase = `https://www.googleapis.com/books/v1/volumes`;
    const urlTitleAuthorQuery = `(intitle:\"${req.query.q}\"+OR+inauthor:\"${req.query.q}\")`;
    const urlKeyQueryParam = `key=${googleKey}`;
    const urlMaxResultsQueryParam = `&maxResults=40`;
    const urlStartIndexQueryParam = `&startIndex=${((req.query.page || 0) as number) * 40}`;
    const urlNextPageStartIndexQueryParam = `&startIndex=${((req.query.page || 0) as number) + 1 * 40}`;

    const urlBooksPrintTypeQueryParam = `&printType=books`;
    const urlLanguageRestrictionQueryParam = `&langRestrict=en`;

    const url = `${urlBase}?q=${urlTitleAuthorQuery}&${urlKeyQueryParam}&${urlMaxResultsQueryParam}&${urlStartIndexQueryParam}&${urlBooksPrintTypeQueryParam}&${urlLanguageRestrictionQueryParam}`;
    const nextPageUrl = `${urlBase}?q=${urlTitleAuthorQuery}&${urlKeyQueryParam}&${urlMaxResultsQueryParam}&${urlNextPageStartIndexQueryParam}&${urlBooksPrintTypeQueryParam}&${urlLanguageRestrictionQueryParam}`;
    console.log("query", req.query);

    if (!req.query) {
        return res.send("");
    }

    const response = await fetch(url);

    const result = await response.json();

    const nextPageResult = await fetch(nextPageUrl);

    return res.status(200).send({
        books: result.items,
        totalItems: result.totalItems,
        nextPageExists: !!nextPageResult,
    });
}
