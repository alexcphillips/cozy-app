import type { Request, Response } from "express";
import type { BookSearchResponse } from "@cozy/shared";
import { BOOKS } from "../../config/constants";
import { AppError } from "../../http/AppError";
import { searchBooks } from "./books.client";

export async function getBooks(req: Request, res: Response) {
    const searchTerm = req.query.q;

    if (typeof searchTerm !== "string" || !searchTerm.trim()) {
        throw AppError.badRequest("Missing search term");
    }

    const page = Math.max(0, Number(req.query.page) || 0);

    const { books, totalItems } = await searchBooks(searchTerm.trim(), page);

    // Derived from the reported total rather than by fetching the next page,
    // which previously doubled every search into two upstream calls.
    const body: BookSearchResponse = {
        books,
        totalItems,
        nextPageExists: (page + 1) * BOOKS.RESULTS_PER_PAGE < totalItems,
    };

    res.status(200).json(body);
}
