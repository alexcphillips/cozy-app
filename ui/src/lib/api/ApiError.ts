/**
 * A non-2xx response. `message` is the server's `{ error }` text when it sent
 * one, so it is already safe and useful to show to the user.
 */
export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }

    /** True when the session is missing or expired and the user should re-login. */
    get isUnauthorized(): boolean {
        return this.status === 401;
    }
}

/** Narrows an unknown catch value to a message worth rendering. */
export function toErrorMessage(error: unknown): string {
    if (error instanceof ApiError) return error.message;
    if (error instanceof Error) return error.message;
    return String(error);
}
