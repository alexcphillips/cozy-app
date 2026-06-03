import { Link } from "react-router-dom";
import styles from "./LinkCard.module.css";

type LinkCardData = {
    title: string;
    description?: string;
    to: string;
    border: string;
};

export default function LinkCard({
    title,
    description,
    to,
    border,
}: LinkCardData) {
    return (
        <Link
            className={styles["card-container"]}
            style={{ border: border }}
            to={to}
        >
            <div className={styles["title-container"]}>{title}</div>
            <div className={styles["description-container"]}>{description}</div>
        </Link>
    );
}
