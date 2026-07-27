import type React from "react";
import { useState } from "react";
import styles from "./LoginForm.module.css";
import "../../../../app/styles/globals.css";
import { validateEmail, validatePassword } from "@cozy/shared";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";
import { authApi } from "../../api/auth.api";
import { toErrorMessage } from "../../../../lib/api";
import { ROUTES } from "../../../../app/routes.paths";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);

    async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        // Same rules the server enforces - see @cozy/shared/validation.
        const emailResult = validateEmail(email);
        const passwordResult = validatePassword(password);

        if (!emailResult.isValid || !passwordResult.isValid) {
            setError(emailResult.errorMessage ?? passwordResult.errorMessage!);
            return;
        }

        setIsLoading(true);
        try {
            const { token } = await authApi.login({ email, password });
            login(token);
            navigate(ROUTES.dietTracker);
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={styles["form-container"]}>
            <form onSubmit={handleSubmit} noValidate autoComplete="off">
                {error && <p className={styles["error-text"]}>{error}</p>}

                <div className={styles["email-container"]}>
                    <label htmlFor="email" className="screen-reader-only">
                        Email:
                    </label>
                    <input
                        className={styles["email-input"]}
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className={styles["password-container"]}>
                    <label htmlFor="password" className="screen-reader-only">
                        Password:
                    </label>
                    <input
                        className={styles["password-input"]}
                        id="password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <button
                    type="submit"
                    className={styles["submit-button"]}
                    disabled={isLoading}
                >
                    {isLoading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}
