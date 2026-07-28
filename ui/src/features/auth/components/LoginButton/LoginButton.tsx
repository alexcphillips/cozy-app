import { Link } from "react-router-dom";
import styles from "./LoginButton.module.css";

export default function LoginButton() {
    return (
        <Link className={styles["login-container"]} to="/login">
            Login
        </Link>
    );
}
