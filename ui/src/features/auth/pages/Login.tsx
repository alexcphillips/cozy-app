import LoginForm from "../components/LoginForm/LoginForm";
import styles from "./Login.module.css";

export default function Login() {
    return (
        <div className={styles["login-page"]}>
            <h1>Login</h1>
            <LoginForm />
            <p className={styles["register-text"]}>
                or <a href="/register">create a new account</a>
            </p>
        </div>
    );
}
