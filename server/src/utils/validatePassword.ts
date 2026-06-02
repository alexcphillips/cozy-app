import { APP_CONSTANTS } from "../app.constants";

export type ValidatePasswordResult = {
    isValid: boolean;
    errorMessage: string | null;
};

const VALID_PASSWORD_RESULT = { isValid: true, errorMessage: null };

export default function validatePassword(
    password: string,
): ValidatePasswordResult {
    if (
        password.length < APP_CONSTANTS.auth.PASSWORD_MINIMUM_LENGTH ||
        password.length > APP_CONSTANTS.auth.PASSWORD_MAXIMUM_LENGTH
    ) {
        return {
            isValid: false,
            errorMessage: APP_CONSTANTS.auth.INVALID_PASSWORD_LENGTH_TEXT,
        };
    }

    return VALID_PASSWORD_RESULT;
}
