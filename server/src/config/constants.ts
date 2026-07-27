/**
 * Server-only constants. Anything the UI also needs to know (password rules,
 * validation copy, endpoint paths) lives in `@cozy/shared` instead, so the two
 * sides cannot drift.
 */
export const AUTH = {
    SCRYPT_KEY_LENGTH: 64,
    TOKEN_TTL: "7d",
    MISSING_TOKEN_TEXT: "Missing token",
    INVALID_TOKEN_TEXT: "Invalid token",
} as const;

export const BOOKS = {
    RESULTS_PER_PAGE: 40,
    API_BASE_URL: "https://www.googleapis.com/books/v1/volumes",
} as const;
