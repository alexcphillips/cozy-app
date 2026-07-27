import styles from "./NotificationDisplay.module.css";

export default function NotificationDisplay() {
    return (
        <div className={styles["notification-display"]}>
            {" "}
            {[1, 2].map((num) => (
                <div className={styles["notification"]}>
                    notification {num} lorem abcdsadsa as adfasf af afs
                    asdffasfasfsdf asfd
                </div>
            ))}
        </div>
    );
}
