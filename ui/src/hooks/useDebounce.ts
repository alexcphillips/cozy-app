import { useState, useEffect } from "react";

/**
 * Returns `value` delayed by `delay` ms, resetting the timer on every change.
 * Generic so the caller keeps its type - a debounced string stays a string.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Clear the timer if the value changes before the delay finishes.
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
