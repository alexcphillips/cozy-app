import styles from "./ActionBar.module.css";

export default function ActionBar() {
    return null;
    return (
        <div className={styles["action-bar"]}>
            {[1, 2, 3, 4, 5, 6].map((num, i) => (
                <div key={`${num}-${i}`} className={styles["action-bar-item"]}>
                    Card: {num}
                </div>
            ))}
        </div>
    );
}
