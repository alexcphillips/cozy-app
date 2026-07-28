export type ValidationResult = {
    isValid: boolean;
    /** Human-readable, safe to show to the user. `null` when `isValid`. */
    errorMessage: string | null;
};

export const VALID: ValidationResult = { isValid: true, errorMessage: null };

export function invalid(errorMessage: string): ValidationResult {
    return { isValid: false, errorMessage };
}
