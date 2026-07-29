function required(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `Missing required environment variable ${name}. See .env.example.`,
        );
    }

    return value;
}

function optional(name: string, fallback: string): string {
    return process.env[name] || fallback;
}

/**
 * Every environment variable the server reads, resolved and validated once at
 * import time. Nothing else in `server/` may touch `process.env` - if you need a
 * new setting, add it here so a misconfigured deploy fails at boot instead of on
 * the first request that happens to need it.
 */
export const ENV = {
    PORT: Number(optional("PORT", "3000")),
    NODE_ENV: optional("NODE_ENV", "development"),

    DB: {
        USER: optional("DB_USER", "postgres"),
        HOST: optional("DB_HOST", "localhost"),
        NAME: optional("DB_NAME", "cozy_apps"),
        PASSWORD: required("DB_PASSWORD"),
        PORT: Number(optional("DB_PORT", "5432")),
    },

    JWT_SECRET: required("JWT_SECRET"),
    GOOGLE_API_KEY: optional("GOOGLE_API_KEY", ""),

    /** Browser origins allowed to call this API with credentials. */
    CORS_ORIGINS: optional(
        "CORS_ORIGINS",
        "http://localhost:5173,https://haileysbookshelf.com",
    )
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
} as const;

export const IS_PRODUCTION = ENV.NODE_ENV === "production";
