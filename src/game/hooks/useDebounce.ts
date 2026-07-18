import { useState, useEffect } from "react";

// 1. Create the reusable debounce hook
export function useDebounce(value: unknown, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clear timer if the value changes before delay finishes
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
