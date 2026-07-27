import type React from "react";
import { useState } from "react";
import styles from "./RegisterForm.module.css";
import { useNavigate } from "react-router-dom";
import {
    validateEmail,
    validatePassword,
    validateUsername,
} from "@cozy/shared";
import { authApi } from "../../api/auth.api";
import { toErrorMessage } from "../../../../lib/api";
import { ROUTES } from "../../../../app/routes.paths";

export default function RegisterForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        // Same rules the server enforces - see @cozy/shared/validation.
        const failure = [
            validateUsername(username),
            validateEmail(email),
            validatePassword(password),
        ].find((result) => !result.isValid);

        if (failure) {
            setError(failure.errorMessage!);
            return;
        }

        setIsLoading(true);
        try {
            await authApi.register({ email, password, username });
            navigate(ROUTES.login);
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={styles["form-container"]}>
            <form
                className={styles["register-form"]}
                onSubmit={handleSubmit}
                noValidate
                autoComplete="off"
            >
                {error && <p className={styles["error-text"]}>{error}</p>}

                <div>
                    <label htmlFor="username" className="screen-reader-only">
                        Username:
                    </label>
                    <input
                        id="username"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label htmlFor="email" className="screen-reader-only">
                        Email:
                    </label>
                    <input
                        id="email"
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label htmlFor="password" className="screen-reader-only">
                        Password:
                    </label>
                    <input
                        id="password"
                        placeholder="Password"
                        type="password"
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
                    {isLoading ? "Registering..." : "Register"}
                </button>
            </form>
        </div>
    );
}
