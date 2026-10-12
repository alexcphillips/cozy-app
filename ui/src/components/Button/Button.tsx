import styles from "./Button.module.css";

type ButtonProps = {
    text: string;
    onClick: () => void;
    disabled?: boolean;
};

export default function Button({
    text,
    onClick,
    disabled = false,
}: ButtonProps) {
    return (
        <button
            type="button"
            className={styles["button"]}
            onClick={onClick}
            disabled={disabled}
        >
            {text}
        </button>
    );
}
