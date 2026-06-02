import { APP_CONSTANTS } from "../app.constants";

export type ValidateEmailResult = {
    isValid: boolean;
    errorMessage: string | null;
};

export function validateEmail(email: string) {
    if (!email && email.includes("@")) {
        return {
            isValid: false,
            errorMessage: APP_CONSTANTS.auth.INVALID_EMAIL_OR_PASSWORD_TEXT,
        };
    }

    return { isValid: true, errorMessage: null };
}
