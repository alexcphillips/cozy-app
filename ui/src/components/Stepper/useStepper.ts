import { useState } from "react";

export function useStepper(stepsLength: number) {
    const [stepIndex, setStepIndex] = useState(0);

    function next() {
        setStepIndex((prev) => {
            if (prev >= stepsLength - 1) return prev;
            return prev + 1;
        });
    }

    function previous() {
        setStepIndex((prev) => {
            if (prev <= 0) return prev;
            return prev - 1;
        });
    }

    function goTo(index: number) {
        if (index < 0 || index >= stepsLength) return;
        setStepIndex(index);
    }

    function reset() {
        setStepIndex(0);
    }

    const isFirst = stepIndex === 0;
    const isLast = stepIndex === stepsLength - 1;

    return { stepIndex, next, previous, goTo, reset, isFirst, isLast };
}
