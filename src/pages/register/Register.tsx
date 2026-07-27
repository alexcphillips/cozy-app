import RegisterForm from "../../components/ui/RegisterForm/RegisterForm";
import styles from "./Register.module.css";

export default function Register() {
    return (
        <div className={styles["register-page"]}>
            <h1>Create account</h1>
            <RegisterForm />
            <p>
                Already have an account? <a href="/login">Log in here</a>
            </p>
        </div>
    );
}
