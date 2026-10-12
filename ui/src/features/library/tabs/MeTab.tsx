import type { LibraryBook, ReadingStatus } from "@cozy/shared";
import styles from "./MeTab.module.css";
import ReadingNowCard from "../components/ReadingNowCard";
import BookCover from "../components/BookCover";
import Button from "@/components/Button/Button";
import { BookGridMessage } from "../components/BookGrid";

type MeTabProps = {
    books: LibraryBook[];
    isLoading: boolean;
    pendingId: string | null;
    onLogProgress: (instanceId: string, progressValue: number) => void;
    onSetStatus: (instanceId: string, status: ReadingStatus) => void;
};

export default function MeTab({
    books,
    isLoading,
    pendingId,
    onLogProgress,
    onSetStatus,
}: MeTabProps) {
    const readingNow = books.filter((book) => book.status === "reading");
    const upNext = books.filter((book) => book.status === "tbr");
    const finishedCount = books.filter(
        (book) => book.status === "finished",
    ).length;

    if (isLoading) {
        return <BookGridMessage>loading your shelf...</BookGridMessage>;
    }

    return (
        <div className={styles["me"]}>
            <div className={styles["stat-row"]}>
                <div className={styles["stat"]}>
                    <span className={styles["stat-value"]}>
                        {readingNow.length}
                    </span>
                    <span className={styles["stat-label"]}>reading now</span>
                </div>
                <div className={styles["stat"]}>
                    <span className={styles["stat-value"]}>
                        {finishedCount}
                    </span>
                    <span className={styles["stat-label"]}>finished</span>
                </div>
                <div className={styles["stat"]}>
                    <span className={styles["stat-value"]}>
                        {upNext.length}
                    </span>
                    <span className={styles["stat-label"]}>want to read</span>
                </div>
            </div>

            <section className={styles["section"]}>
                <h2 className={styles["section-title"]}>Reading now</h2>

                {readingNow.length ? (
                    <div className={styles["reading-list"]}>
                        {readingNow.map((book) => (
                            <ReadingNowCard
                                key={book.id}
                                book={book}
                                isPending={pendingId === book.id}
                                onLogProgress={(value) =>
                                    onLogProgress(book.id, value)
                                }
                                onMarkFinished={() =>
                                    onSetStatus(book.id, "finished")
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <BookGridMessage>
                        Nothing in progress. Start something from Want to read,
                        or find a book in Discover.
                    </BookGridMessage>
                )}
            </section>

            {upNext.length > 0 && (
                <section className={styles["section"]}>
                    <h2 className={styles["section-title"]}>Up next</h2>

                    <ul className={styles["up-next-list"]}>
                        {upNext.map((book) => (
                            <li key={book.id} className={styles["up-next-row"]}>
                                <div className={styles["up-next-cover"]}>
                                    <BookCover
                                        url={book.thumbnailUrl ?? undefined}
                                        title={book.title}
                                    />
                                </div>

                                <div className={styles["up-next-meta"]}>
                                    <p className={styles["up-next-title"]}>
                                        {book.title}
                                    </p>
                                    <p className={styles["up-next-author"]}>
                                        {book.authors.join(", ") ||
                                            "Unknown author"}
                                    </p>
                                </div>

                                <Button
                                    text="Start"
                                    onClick={() =>
                                        onSetStatus(book.id, "reading")
                                    }
                                    disabled={pendingId === book.id}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
