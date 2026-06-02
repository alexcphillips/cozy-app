import LoginForm from "../../components/ui/LoginForm/LoginForm";
import styles from "./Login.module.css";

export default function Login() {
    return (
        <div className={styles["login-page-container"]}>
            <div className={styles["login-container"]}>
                <LoginForm />
            </div>
        </div>
    );
}
