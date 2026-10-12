import styles from "./BookTile.module.css";
import BookCover from "./BookCover";
import AddToLibraryButton from "./AddToLibraryButton";

type BookTileProps = {
    title: string;
    url?: string;
    author?: string;
    /** Omitted for tiles that aren't actionable (My Library, Book Club). */
    onAddToLibrary?: () => void;
    isSaved?: boolean;
};

export default function BookTile({
    title,
    url,
    author,
    onAddToLibrary,
    isSaved = false,
}: BookTileProps) {
    return (
        <div className={styles["tile"]}>
            <BookCover url={url} title={title} />

            <div className={styles["meta"]}>
                <p className={styles["title"]} title={title}>
                    {title}
                </p>
                <p className={styles["author"]}>{author || "Unknown author"}</p>
            </div>

            {onAddToLibrary && (
                <AddToLibraryButton
                    onClick={onAddToLibrary}
                    isSaved={isSaved}
                />
            )}
        </div>
    );
}
