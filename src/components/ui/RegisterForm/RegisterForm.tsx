import type React from "react";
import { useState } from "react";
import styles from "./RegisterForm.module.css";
import { useNavigate } from "react-router-dom";
import { isEmailValid } from "../../../utils/validateEmail";
import { isPasswordValidLength } from "../../../utils/validatePassword";

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

        if (!username || username.length < 4) {
            setError("Username must be at least 4 characters");
            return; // FIXED: Added missing return statement
        }
        if (!isEmailValid(email)) {
            setError("Invalid email");
            return;
        }
        if (!isPasswordValidLength(password)) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password, username }),
            });

            setIsLoading(false);

            if (!response.ok) {
                setError("Error registering user");
                return;
            }

            navigate("/login");
        } catch (err) {
            setIsLoading(false);
            setError("Connection error. Please try again later.");
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
