import styles from "./Stepper.module.css";
import Step from "./Step";

type StepperProps = { steps: string[]; currentStep: number };

export default function Stepper({ steps, currentStep }: StepperProps) {
    return (
        <div className={styles["stepper-container"]}>
            {steps.map((step, i) => (
                <Step
                    label={step}
                    key={`${step}-${i}`}
                    isActive={i === currentStep}
                />
            ))}
        </div>
    );
}
