import styles from "./WeightInputForm.module.css";

type WeightInputFormProps = {
    value: string;
    error: string;
    isLoading: boolean;
    onChange: (val: string) => void;
    onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
};

export default function WeightInputForm({
    value,
    error,
    isLoading,
    onChange,
    onSubmit,
}: WeightInputFormProps) {
    return (
        <div className={styles["weight-input-section"]}>
            <form autoComplete="off" onSubmit={onSubmit}>
                <label
                    className={styles["weight-input-label"]}
                    htmlFor="weight-input"
                >
                    Record Today's Weight
                </label>

                <div className={styles["input-row"]}>
                    <input
                        className={styles["weight-input"]}
                        id="weight-input"
                        type="number"
                        step="0.1"
                        value={value}
                        placeholder="lbs"
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <button
                        className={styles["weight-submit-button"]}
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "..." : "add"}
                    </button>
                </div>

                {error && <p className={styles["error-text"]}>{error}</p>}
            </form>
        </div>
    );
}
