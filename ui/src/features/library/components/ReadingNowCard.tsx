import { useState } from "react";
import type { LibraryBook } from "@cozy/shared";
import styles from "./ReadingNowCard.module.css";
import BookCover from "./BookCover";
import Button from "@/components/Button/Button";
import {
    completionRatio,
    estimateFinish,
    formatProgressOfTotal,
} from "../readingProgress";

type ReadingNowCardProps = {
    book: LibraryBook;
    isPending: boolean;
    onLogProgress: (progressValue: number) => void;
    onMarkFinished: () => void;
};

const UNIT_LABELS: Record<LibraryBook["progressUnit"], string> = {
    page: "page reached",
    percent: "percent complete",
    minute: "minutes in",
};

export default function ReadingNowCard({
    book,
    isPending,
    onLogProgress,
    onMarkFinished,
}: ReadingNowCardProps) {
    const [draftProgress, setDraftProgress] = useState("");

    const ratio = completionRatio(book);
    const estimate = estimateFinish(book);

    function handleLog() {
        const parsed = Number(draftProgress);

        if (!draftProgress || !Number.isFinite(parsed) || parsed < 0) return;

        onLogProgress(parsed);
        setDraftProgress("");
    }

    return (
        <article className={styles["card"]}>
            <div className={styles["cover-slot"]}>
                <BookCover
                    url={book.thumbnailUrl ?? undefined}
                    title={book.title}
                />
            </div>

            <div className={styles["body"]}>
                <h3 className={styles["title"]}>{book.title}</h3>
                <p className={styles["author"]}>
                    {book.authors.length
                        ? book.authors.join(", ")
                        : "Unknown author"}
                </p>

                <p className={styles["progress-text"]}>
                    {formatProgressOfTotal(book)}
                    {ratio !== null && (
                        <span className={styles["progress-percent"]}>
                            {" · "}
                            {Math.round(ratio * 100)}%
                        </span>
                    )}
                </p>

                {ratio !== null && (
                    <div
                        className={styles["progress-track"]}
                        role="progressbar"
                        aria-valuenow={Math.round(ratio * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progress through ${book.title}`}
                    >
                        <div
                            className={styles["progress-fill"]}
                            style={{ width: `${ratio * 100}%` }}
                        />
                    </div>
                )}

                <p className={styles["estimate"]}>
                    {estimate
                        ? `about ${estimate.daysRemaining} ${estimate.daysRemaining === 1 ? "day" : "days"} left — finishing around ${estimate.label}`
                        : "log two days to see a finish estimate"}
                </p>

                <div className={styles["actions"]}>
                    <label className={styles["log-field"]}>
                        <span className={styles["log-label"]}>
                            {UNIT_LABELS[book.progressUnit]}
                        </span>
                        <input
                            className={styles["log-input"]}
                            type="number"
                            min="0"
                            step="any"
                            inputMode="numeric"
                            placeholder={
                                book.latestProgress === null
                                    ? "0"
                                    : String(Math.round(book.latestProgress))
                            }
                            value={draftProgress}
                            onChange={(e) => setDraftProgress(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleLog();
                            }}
                            onWheel={(e) => e.currentTarget.blur()}
                            disabled={isPending}
                        />
                    </label>

                    <Button
                        text={isPending ? "saving..." : "Log"}
                        onClick={handleLog}
                        disabled={isPending || !draftProgress}
                    />

                    <Button
                        text="Finished"
                        onClick={onMarkFinished}
                        disabled={isPending}
                    />
                </div>
            </div>
        </article>
    );
}
