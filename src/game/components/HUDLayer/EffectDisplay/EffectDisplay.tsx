import styles from "./EffectDisplay.module.css";

export default function EffectDisplay() {
    return (
        <div className={styles["effect-container"]}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5].map((num) => (
                <div className={styles["effect"]}>E{num}</div>
            ))}
        </div>
    );
}
