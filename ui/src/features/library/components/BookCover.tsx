import styles from "./BookCover.module.css";

type BookCoverProps = {
    url?: string;
    title: string;
};

/**
 * Fixed 2:3 cover slot. The aspect ratio is reserved before the image loads so
 * the results grid doesn't reflow as Google's variably-sized thumbnails arrive.
 */
export default function BookCover({ url, title }: BookCoverProps) {
    if (!url) {
        return (
            <div className={styles["cover"]} aria-hidden="true">
                <span className={styles["fallback-initial"]}>
                    {title.trim().charAt(0).toUpperCase() || "?"}
                </span>
            </div>
        );
    }

    return (
        <img
            className={styles["cover"]}
            src={url}
            alt={`Cover of ${title}`}
            loading="lazy"
        />
    );
}
