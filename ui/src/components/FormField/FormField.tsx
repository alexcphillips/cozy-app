import type { InputHTMLAttributes } from "react";
import styles from "./FormField.module.css";

type FormFieldProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    suffix?: string;
} & Pick<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "min" | "step" | "placeholder" | "autoComplete"
>;

export default function FormField({
    id,
    label,
    value,
    onChange,
    suffix,
    ...inputProps
}: FormFieldProps) {
    return (
        <div className={styles["field"]}>
            <label htmlFor={id}>
                {label}
                {suffix && <span className={styles["suffix"]}> ({suffix})</span>}
            </label>
            <input
                id={id}
                className={styles["field-input"]}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                {...inputProps}
            />
        </div>
    );
}
