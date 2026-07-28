import { useNavigate } from "react-router-dom";
import styles from "./AppTitle.module.css";

type AppTitleProps = { text: string };

export default function AppTitle({ text }: AppTitleProps) {
    const navigate = useNavigate();

    return (
        <div className={styles["app-title"]} onClick={() => navigate("/")}>
            {text}
        </div>
    );
}
