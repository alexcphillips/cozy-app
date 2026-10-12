import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "./PasswordInput.module.css";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export default function PasswordInput({
    className,
    disabled,
    ...inputProps
}: PasswordInputProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className={styles["wrapper"]}>
            <input
                {...inputProps}
                type={isVisible ? "text" : "password"}
                className={`${styles["input"]} ${className ?? ""}`}
                disabled={disabled}
            />
            <button
                type="button"
                className={styles["toggle"]}
                onClick={() => setIsVisible((v) => !v)}
                disabled={disabled}
                aria-label={isVisible ? "Hide password" : "Show password"}
                aria-pressed={isVisible}
            >
                {isVisible ? <FaEyeSlash /> : <FaEye />}
            </button>
        </div>
    );
}
