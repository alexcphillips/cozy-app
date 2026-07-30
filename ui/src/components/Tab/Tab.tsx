import styles from "./Tab.module.css";

export default function Tab({
    title,
    handleClick,
}: {
    title: string;
    handleClick: () => void;
}) {
    return (
        <button className={styles["tab-button"]} onClick={() => handleClick}>
            <p className={styles["tab-title"]}>{title}</p>
        </button>
    );
}
