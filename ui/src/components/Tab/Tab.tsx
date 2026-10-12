import styles from "./Tab.module.css";

interface TabProps {
    title: string;
    handleClick: () => void;
    isActive: boolean;
}

export default function Tab({ title, handleClick, isActive }: TabProps) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles["tab-button"]} ${isActive ? styles["active"] : ""}`}
            onClick={handleClick}
        >
            <p className={styles["tab-title"]}>{title}</p>
        </button>
    );
}
