import styles from "./ErrorMessage.module.css";

export type ErrorMessageProps = {
    message: string;
};

/**
 * Holds its vertical space even when empty, so showing or clearing an error
 * doesn't shift the surrounding content.
 */
export default function ErrorMessage({ message }: ErrorMessageProps) {
    return (
        <p
            role="alert"
            className={`${styles["error-message"]} ${message ? styles["error-message-visible"] : ""}`}
        >
            {message}
        </p>
    );
}
