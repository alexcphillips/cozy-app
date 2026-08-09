import styles from "./TextInputWithSmallSelect.module.css";

type TextInputWithSmallSelectProps = {
    className?: string;
    inputClassName?: string;
    labelText: string;
    selectLabelText: string;
    inputId: string;
    selectId: string;
    inputValue: string;
    setInputValue: (value: string) => void;
    selectValue: string;
    setSelectValue: (value: string) => void;
    selectOptions: string[];
};

export default function TextInputWithSmallSelect({
    className,
    inputClassName = "",
    labelText,
    selectLabelText,
    inputId,
    selectId,
    inputValue,
    setInputValue,
    selectValue,
    setSelectValue,
    selectOptions,
}: TextInputWithSmallSelectProps) {
    return (
        <div className={className}>
            <label htmlFor={inputId}>{labelText}</label>
            <div className={styles["inputs-container"]}>
                <input
                    id={inputId}
                    type="number"
                    min="0"
                    step="any"
                    className={`${inputClassName} ${styles["compound-input"]}`}
                    onChange={(e) => setInputValue(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    value={inputValue}
                />
                <select
                    id={selectId}
                    aria-label={selectLabelText}
                    className={`${inputClassName} ${styles["compound-select"]}`}
                    onChange={(e) => setSelectValue(e.target.value)}
                    value={selectValue}
                >
                    <option value="" disabled hidden>
                        units
                    </option>
                    {selectOptions.map((opt, i) => (
                        <option key={`${opt}-${i}`} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
