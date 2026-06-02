export const APP_CONSTANTS = {
    auth: {
        SCRYPT_KEY_LENGTH: 64,
        PASSWORD_MINIMUM_LENGTH: 8,
        PASSWORD_MAXIMUM_LENGTH: 32,
        INVALID_PASSWORD_LENGTH_TEXT:
            "Password must be between 8 and 32 characters",
        INVALID_USERNAME_LENGTH_TEXT:
            "Username must be between 3 and 32 characters",
        INVALID_EMAIL_TEXT: "Email is invalid",
        INVALID_EMAIL_OR_PASSWORD_TEXT: "Invalid email or password",
        EMAIL_OR_PASSWORD_VALIDATION_UNKNOWN_ISSUE:
            "An issue occurred validating email or password",
        MISSING_TOKEN_TEXT: "Missing token",
        INVALID_TOKEN_TEXT: "Invalid token",
    },
} as const;
