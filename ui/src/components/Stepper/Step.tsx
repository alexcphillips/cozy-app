import styles from "./Step.module.css";

type StepProps = {
    label: string;
    isActive: boolean;
};

export default function Step({ label, isActive }: StepProps) {
    return (
        <div
            className={`${styles["header-label"]} ${isActive ? styles["active-step"] : ""}`}
        >
            {label}
        </div>
    );
}
