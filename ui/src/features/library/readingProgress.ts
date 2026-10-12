import type { LibraryBook, ProgressUnit } from "@cozy/shared";

/** Short label for a progress unit, e.g. "page 212" / "51%" / "212 min". */
export function formatProgress(
    value: number,
    unit: ProgressUnit,
): string {
    if (unit === "percent") return `${Math.round(value)}%`;
    if (unit === "minute") return `${Math.round(value)} min`;
    return `page ${Math.round(value)}`;
}

/** The denominator only exists for page-counted books. */
export function formatProgressOfTotal(book: LibraryBook): string {
    const { latestProgress, progressUnit, pageCount } = book;

    if (latestProgress === null) return "not started";

    const current = formatProgress(latestProgress, progressUnit);

    if (progressUnit === "page" && pageCount) {
        return `${current} of ${pageCount}`;
    }

    return current;
}

/**
 * How far through the book, 0-1, or null when there's nothing to divide by.
 * Clamped because Google's page counts are frequently wrong and a user who
 * reads past the reported end shouldn't see a bar overflow.
 */
export function completionRatio(book: LibraryBook): number | null {
    const { latestProgress, progressUnit, pageCount } = book;

    if (latestProgress === null) return null;
    if (progressUnit === "percent") {
        return Math.min(1, Math.max(0, latestProgress / 100));
    }
    if (progressUnit === "page" && pageCount && pageCount > 0) {
        return Math.min(1, Math.max(0, latestProgress / pageCount));
    }

    return null;
}

export type FinishEstimate = {
    daysRemaining: number;
    /** Localised date, e.g. "Oct 17". */
    label: string;
};

/**
 * Projects a finish date from the server-computed pace.
 *
 * Returns null unless there's genuinely enough to project from: a known total,
 * a logged position, and a pace built from at least two days of logs. Guessing
 * from a single data point would produce a confident-looking number with no
 * basis.
 */
export function estimateFinish(
    book: LibraryBook,
    today: Date = new Date(),
): FinishEstimate | null {
    const { latestProgress, pacePerDay, pageCount, progressUnit } = book;

    if (latestProgress === null || !pacePerDay || pacePerDay <= 0) return null;

    const total = progressUnit === "percent" ? 100 : pageCount;

    if (!total || total <= latestProgress) return null;

    const daysRemaining = Math.ceil((total - latestProgress) / pacePerDay);

    if (!Number.isFinite(daysRemaining) || daysRemaining <= 0) return null;

    const finishDate = new Date(today);
    finishDate.setDate(finishDate.getDate() + daysRemaining);

    return {
        daysRemaining,
        label: finishDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        }),
    };
}

export const STATUS_LABELS: Record<LibraryBook["status"], string> = {
    tbr: "Want to read",
    reading: "Reading",
    finished: "Finished",
    dnf: "Didn't finish",
};
