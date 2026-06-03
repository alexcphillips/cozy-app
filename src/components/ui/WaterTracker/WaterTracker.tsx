import { useState } from "react";
import styles from "./WaterTracker.module.css";

export default function WaterTracker() {
    const [cups, setCups] = useState(0);

    const handleClick = () => {
        setCups((prev) => (prev >= 4 ? 0 : prev + 1));
    };

    return (
        <div className={styles.wrapper} onClick={handleClick}>
            <div
                className={styles.water}
                style={{ height: `${(cups / 4) * 100}%` }}
            />

            <img className={styles.cup} src="/stanley.png" alt="stanley" />

            <div className={styles.label}>{cups}/4 Stanley</div>
        </div>
    );
}
