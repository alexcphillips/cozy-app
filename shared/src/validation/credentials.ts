import {
    CREDENTIAL_RULES,
    VALIDATION_MESSAGES,
} from "./validation.constants";
import { invalid, VALID, type ValidationResult } from "./validation.types";

/**
 * Deliberately conservative: rejects the obviously-malformed rather than trying
 * to be RFC 5322 complete. Real verification happens by emailing the address.
 */
export function validateEmail(email: string): ValidationResult {
    const parts = email.trim().split("@");

    const looksLikeEmail =
        parts.length === 2 && parts.every((part) => part.length > 0);

    return looksLikeEmail ? VALID : invalid(VALIDATION_MESSAGES.INVALID_EMAIL);
}

export function validatePassword(password: string): ValidationResult {
    const tooShort = password.length < CREDENTIAL_RULES.PASSWORD_MIN_LENGTH;
    const tooLong = password.length > CREDENTIAL_RULES.PASSWORD_MAX_LENGTH;

    return tooShort || tooLong
        ? invalid(VALIDATION_MESSAGES.INVALID_PASSWORD_LENGTH)
        : VALID;
}

export function validateUsername(username: string): ValidationResult {
    const length = username.trim().length;
    const tooShort = length < CREDENTIAL_RULES.USERNAME_MIN_LENGTH;
    const tooLong = length > CREDENTIAL_RULES.USERNAME_MAX_LENGTH;

    return tooShort || tooLong
        ? invalid(VALIDATION_MESSAGES.INVALID_USERNAME_LENGTH)
        : VALID;
}
