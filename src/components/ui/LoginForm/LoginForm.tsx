import type React from "react";
import { useState } from "react";
import styles from "./LoginForm.module.css";
import "../../../globals.css";
import { isEmailValid } from "../../../utils/validateEmail";
import { isPasswordValidLength } from "../../../utils/validatePassword";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/auth";

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

        if (!isEmailValid(email)) {
            setError("Invalid email");
            return;
        }

        if (!isPasswordValidLength(password)) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        setIsLoading(false);

        const result = await response.json();

        if (!response.ok) {
            setError("Invalid email or password");
            return;
        }

        login(result.token);

        navigate("/diet-tracker");
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
                    />
                </div>
                <button type="submit" className={styles["submit-button"]}>
                    {isLoading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}
