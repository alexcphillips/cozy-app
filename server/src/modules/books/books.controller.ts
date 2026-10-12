import type { Request, Response } from "express";
import type {
    AddBookToLibraryRequest,
    Book,
    BookSearchResponse,
    LogReadingProgressRequest,
    ProgressUnit,
    ReadingStatus,
    UpdateReadingStatusRequest,
} from "@cozy/shared";
import {
    isValidsvSEFormat,
    PROGRESS_UNITS,
    READING_STATUSES,
} from "@cozy/shared";
import { BOOKS } from "../../config/constants";
import { AppError } from "../../http/AppError";
import { searchBooks } from "./books.client";
import * as booksRepository from "./books.repository";

/* ---------------------------------------------------------------- search -- */

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

/* --------------------------------------------------------------- library -- */

/** Library routes are mounted behind `auth`, so `req.user` is set. */
function requireUserId(req: Request): number {
    return req.user!.userId;
}

function requireInstanceId(req: Request): string {
    const instanceId = req.params.instanceId;

    if (typeof instanceId !== "string" || !instanceId) {
        throw AppError.badRequest("Missing reading instance id");
    }

    return instanceId;
}

function requireLocalDate(value: unknown): string {
    if (typeof value !== "string" || !isValidsvSEFormat(value)) {
        throw AppError.badRequest("Invalid date");
    }

    return value;
}

function parseStatus(value: unknown): ReadingStatus {
    if (!READING_STATUSES.includes(value as ReadingStatus)) {
        throw AppError.badRequest(
            `Invalid status. Expected one of: ${READING_STATUSES.join(", ")}`,
        );
    }

    return value as ReadingStatus;
}

function parseProgressUnit(value: unknown): ProgressUnit {
    if (value === undefined) return "page";

    if (!PROGRESS_UNITS.includes(value as ProgressUnit)) {
        throw AppError.badRequest(
            `Invalid progress unit. Expected one of: ${PROGRESS_UNITS.join(", ")}`,
        );
    }

    return value as ProgressUnit;
}

/** Rejects anything that would break the `book` upsert downstream. */
function parseBookPayload(value: unknown): Book {
    const book = value as Partial<Book> | undefined;

    if (!book?.id || typeof book.id !== "string") {
        throw AppError.badRequest("Missing book id");
    }

    if (!book.volumeInfo?.title?.trim()) {
        throw AppError.badRequest("Missing book title");
    }

    return book as Book;
}

export async function getLibrary(req: Request, res: Response) {
    res.status(200).json(await booksRepository.findLibrary(requireUserId(req)));
}

export async function addToLibrary(req: Request, res: Response) {
    const body = (req.body ?? {}) as Partial<AddBookToLibraryRequest>;

    const book = parseBookPayload(body.book);
    const status = body.status === undefined ? "tbr" : parseStatus(body.status);
    const progressUnit = parseProgressUnit(body.progressUnit);
    const userId = requireUserId(req);

    const bookRow = await booksRepository.upsertBook(book);

    // Re-adding a book you are already reading is a no-op rather than an error,
    // so a double click doesn't create two shelves entries. Finished and dnf
    // instances don't block, which is what makes a re-read possible.
    const existingInstanceId = await booksRepository.findActiveInstanceForBook(
        userId,
        bookRow.id,
    );

    if (existingInstanceId) {
        res.status(200).json(await booksRepository.findLibrary(userId));
        return;
    }

    await booksRepository.insertReadingInstance({
        userId,
        bookId: bookRow.id,
        status,
        progressUnit,
        // Stamped later, by the status change to `reading` or by the first
        // progress log - both of which carry the user's local date.
        startedOn: null,
    });

    res.status(201).json(await booksRepository.findLibrary(userId));
}

export async function updateReadingStatus(req: Request, res: Response) {
    const body = (req.body ?? {}) as Partial<UpdateReadingStatusRequest>;

    const status = parseStatus(body.status);
    const instanceId = requireInstanceId(req);
    const userId = requireUserId(req);

    // Only the statuses that stamp a date need one.
    const localDate =
        status === "reading" || status === "finished"
            ? requireLocalDate(body.localDate)
            : null;

    const updated = await booksRepository.updateReadingStatus(
        instanceId,
        userId,
        status,
        localDate,
    );

    if (!updated) {
        throw AppError.notFound("Book not found on your shelf");
    }

    res.status(200).json(await booksRepository.findLibrary(userId));
}

export async function logReadingProgress(req: Request, res: Response) {
    const body = (req.body ?? {}) as Partial<LogReadingProgressRequest>;

    const instanceId = requireInstanceId(req);
    const userId = requireUserId(req);
    const localDate = requireLocalDate(body.localDate);
    const progressValue = Number(body.progressValue);

    if (!Number.isFinite(progressValue) || progressValue < 0) {
        throw AppError.badRequest("Invalid progress value");
    }

    // Checked before the insert so a bad id is a 404 rather than a foreign-key
    // error surfacing as a 500.
    if (!(await booksRepository.instanceExistsForUser(instanceId, userId))) {
        throw AppError.notFound("Book not found on your shelf");
    }

    await booksRepository.upsertReadingLog({
        instanceId,
        userId,
        progressValue,
        localDate,
    });

    res.status(201).json(await booksRepository.findLibrary(userId));
}
