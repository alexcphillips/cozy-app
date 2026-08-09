import styles from "./DefaultStepperHeader.module.css";

type DefaultStepperHeader = {
    title: string;
    StepperComponent: React.FC;
};

export default function DefaultStepperHeader({
    title,
    StepperComponent,
}: DefaultStepperHeader) {
    return (
        <div className={styles["header"]}>
            <div className={styles["title"]}>{title}</div>
            <div className={styles["stepper-container"]}>
                <StepperComponent />
            </div>
        </div>
    );
}
