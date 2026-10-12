import styles from "./BookClubTab.module.css";
import BookCover from "../components/BookCover";
import { PLACEHOLDER_BOOK_CLUB } from "../library.placeholder";

export default function BookClubTab() {
    const { currentRead, meetsOn, members, discussionPrompts } =
        PLACEHOLDER_BOOK_CLUB;

    return (
        <div className={styles["book-club"]}>
            <p className={styles["placeholder-note"]}>
                Showing placeholder data — the book club has no backend yet.
            </p>

            <section className={styles["current-read"]}>
                <div className={styles["cover-slot"]}>
                    <BookCover
                        url={currentRead.volumeInfo.imageLinks?.thumbnail}
                        title={currentRead.volumeInfo.title}
                    />
                </div>

                <div className={styles["current-read-meta"]}>
                    <p className={styles["eyebrow"]}>Currently reading</p>
                    <h2 className={styles["current-title"]}>
                        {currentRead.volumeInfo.title}
                    </h2>
                    <p className={styles["current-author"]}>
                        {currentRead.volumeInfo.authors.join(", ")}
                    </p>

                    <dl className={styles["facts"]}>
                        <div className={styles["fact"]}>
                            <dt>Meets</dt>
                            <dd>{meetsOn}</dd>
                        </div>
                        <div className={styles["fact"]}>
                            <dt>Pages</dt>
                            <dd>{currentRead.volumeInfo.pageCount}</dd>
                        </div>
                    </dl>
                </div>
            </section>

            <div className={styles["lower-grid"]}>
                <section className={styles["panel"]}>
                    <h3 className={styles["panel-title"]}>Members</h3>
                    <ul className={styles["member-list"]}>
                        {members.map((member) => (
                            <li key={member} className={styles["member"]}>
                                <span className={styles["member-avatar"]}>
                                    {member.charAt(0)}
                                </span>
                                {member}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className={styles["panel"]}>
                    <h3 className={styles["panel-title"]}>
                        Discussion prompts
                    </h3>
                    <ul className={styles["prompt-list"]}>
                        {discussionPrompts.map((prompt) => (
                            <li key={prompt} className={styles["prompt"]}>
                                {prompt}
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}
