import type { ProgressUnit, ReadingStatus } from "@cozy/shared";

/**
 * Rows exactly as Postgres returns them. NUMERIC columns arrive as `number`
 * because `db/pool.ts` installs a type parser for them; DATE columns are cast
 * to text in the SQL, so they arrive as "YYYY-MM-DD" strings.
 */
export type BookRow = {
    id: string;
    google_volume_id: string;
    title: string;
    authors: string;
    thumbnail_url: string | null;
    page_count: number | null;
};

export type ReadingInstanceIdRow = {
    id: string;
};

/** The joined shape produced by `FIND_LIBRARY_BY_USER`. */
export type LibraryBookRow = {
    id: string;
    book_id: string;
    google_volume_id: string;
    title: string;
    authors: string;
    thumbnail_url: string | null;
    page_count: number | null;
    status: ReadingStatus;
    progress_unit: ProgressUnit;
    started_on: string | null;
    finished_on: string | null;
    latest_progress: number | null;
    latest_log_date: string | null;
    pace_per_day: number | null;
};

export type ReadingLogRow = {
    id: string;
    reading_instance_id: string;
    progress_value: number;
    log_user_date: string;
};
