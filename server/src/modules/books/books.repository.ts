import type {
    Book,
    LibraryBook,
    ProgressUnit,
    ReadingStatus,
} from "@cozy/shared";
import { query } from "../../db";
import {
    FIND_ACTIVE_INSTANCE_FOR_BOOK,
    FIND_INSTANCE_BY_ID_AND_USER,
    FIND_LIBRARY_BY_USER,
    INSERT_READING_INSTANCE,
    TOUCH_INSTANCE_AFTER_LOG,
    UPDATE_READING_INSTANCE_STATUS,
    UPSERT_BOOK,
    UPSERT_READING_LOG,
} from "./books.sql";
import type {
    BookRow,
    LibraryBookRow,
    ReadingInstanceIdRow,
    ReadingLogRow,
} from "./books.types";

function toLibraryBook(row: LibraryBookRow): LibraryBook {
    return {
        id: row.id,
        bookId: row.book_id,
        googleVolumeId: row.google_volume_id,
        title: row.title,
        authors: row.authors ? row.authors.split(", ") : [],
        thumbnailUrl: row.thumbnail_url,
        pageCount: row.page_count,
        status: row.status,
        progressUnit: row.progress_unit,
        startedOn: row.started_on,
        finishedOn: row.finished_on,
        latestProgress: row.latest_progress,
        latestLogDate: row.latest_log_date,
        pacePerDay: row.pace_per_day,
    };
}

export async function findLibrary(userId: number): Promise<LibraryBook[]> {
    const rows = await query<LibraryBookRow>(FIND_LIBRARY_BY_USER, [userId]);
    return rows.map(toLibraryBook);
}

/** Inserts the book if we have not seen it, and refreshes its metadata if we have. */
export async function upsertBook(book: Book): Promise<BookRow> {
    const info = book.volumeInfo;

    const rows = await query<BookRow>(UPSERT_BOOK, [
        book.id,
        info.title,
        info.authors?.join(", ") ?? "",
        info.imageLinks?.thumbnail || null,
        Number.isFinite(info.pageCount) && info.pageCount > 0
            ? info.pageCount
            : null,
    ]);

    const row = rows[0];

    if (!row) throw new Error("UPSERT_BOOK returned no row");

    return row;
}

/** @returns the existing unfinished instance's id, or `null` if there isn't one. */
export async function findActiveInstanceForBook(
    userId: number,
    bookId: string,
): Promise<string | null> {
    const rows = await query<ReadingInstanceIdRow>(
        FIND_ACTIVE_INSTANCE_FOR_BOOK,
        [userId, bookId],
    );

    return rows[0]?.id ?? null;
}

export async function insertReadingInstance(input: {
    userId: number;
    bookId: string;
    status: ReadingStatus;
    progressUnit: ProgressUnit;
    startedOn: string | null;
}): Promise<string> {
    const rows = await query<ReadingInstanceIdRow>(INSERT_READING_INSTANCE, [
        input.userId,
        input.bookId,
        input.status,
        input.progressUnit,
        input.startedOn,
    ]);

    const row = rows[0];

    if (!row) throw new Error("INSERT_READING_INSTANCE returned no row");

    return row.id;
}

export async function instanceExistsForUser(
    instanceId: string,
    userId: number,
): Promise<boolean> {
    const rows = await query<ReadingInstanceIdRow>(
        FIND_INSTANCE_BY_ID_AND_USER,
        [instanceId, userId],
    );

    return rows.length > 0;
}

/** @returns `false` if the instance did not exist for this user. */
export async function updateReadingStatus(
    instanceId: string,
    userId: number,
    status: ReadingStatus,
    localDate: string | null,
): Promise<boolean> {
    const rows = await query<ReadingInstanceIdRow>(
        UPDATE_READING_INSTANCE_STATUS,
        [instanceId, userId, status, localDate],
    );

    return rows.length > 0;
}

export async function upsertReadingLog(input: {
    instanceId: string;
    userId: number;
    progressValue: number;
    localDate: string;
}): Promise<ReadingLogRow> {
    const rows = await query<ReadingLogRow>(UPSERT_READING_LOG, [
        input.instanceId,
        input.userId,
        input.progressValue,
        input.localDate,
    ]);

    const row = rows[0];

    if (!row) throw new Error("UPSERT_READING_LOG returned no row");

    await query<ReadingInstanceIdRow>(TOUCH_INSTANCE_AFTER_LOG, [
        input.instanceId,
        input.userId,
        input.localDate,
    ]);

    return row;
}
