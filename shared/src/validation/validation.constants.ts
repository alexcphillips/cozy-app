/**
 * The ONE definition of the credential rules. The server enforces them and the
 * UI pre-checks against them, so the two can never drift apart.
 */
export const CREDENTIAL_RULES = {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 32,
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 32,
} as const;

export const VALIDATION_MESSAGES = {
    INVALID_PASSWORD_LENGTH: `Password must be between ${CREDENTIAL_RULES.PASSWORD_MIN_LENGTH} and ${CREDENTIAL_RULES.PASSWORD_MAX_LENGTH} characters`,
    INVALID_USERNAME_LENGTH: `Username must be between ${CREDENTIAL_RULES.USERNAME_MIN_LENGTH} and ${CREDENTIAL_RULES.USERNAME_MAX_LENGTH} characters`,
    INVALID_EMAIL: "Email is invalid",
    /** Deliberately vague: never reveal which half of the pair was wrong. */
    INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
} as const;
