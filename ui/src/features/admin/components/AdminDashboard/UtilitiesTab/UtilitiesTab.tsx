import styles from "./UtilitiesTab.module.css";

const utilities = [
    { title: "1" },
    { title: "2" },
    { title: "3" },
    { title: "4" },
];

export default function UtilitiesTab() {
    return (
        <div className={styles["utilities-container"]}>
            {utilities.map((utility) => (
                <div className={styles["utility-card"]}>{utility.title}</div>
            ))}
        </div>
    );
}
