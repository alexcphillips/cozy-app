import { apiFetch } from "./apiFetch";
import { ApiError } from "./ApiError";

type QueryParams = Record<string, string | number | boolean | undefined>;

function withQuery(path: string, params?: QueryParams): string {
    if (!params) return path;

    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) search.set(key, String(value));
    }

    const queryString = search.toString();

    return queryString ? `${path}?${queryString}` : path;
}

async function parse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new ApiError(response.status, await readErrorMessage(response));
    }

    if (response.status === 204) return undefined as T;

    return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const body: unknown = await response.json();

        if (
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
        ) {
            return body.error;
        }
    } catch {
        // Non-JSON error body; fall through to the generic message.
    }

    return `Request failed (${response.status})`;
}

/**
 * Typed JSON access to the API. Every feature's `*.api.ts` is built from these
 * three calls, and each one names its response type from `@cozy/shared`, so a
 * contract change breaks the call site at compile time.
 *
 * All three throw {@link ApiError} on a non-2xx response - callers use
 * try/catch rather than checking `response.ok`.
 */
export const api = {
    get<T>(path: string, params?: QueryParams): Promise<T> {
        return apiFetch(withQuery(path, params)).then(parse<T>);
    },

    post<T>(path: string, body?: unknown): Promise<T> {
        return apiFetch(path, {
            method: "POST",
            body: body === undefined ? undefined : JSON.stringify(body),
        }).then(parse<T>);
    },

    put<T>(path: string, body?: unknown): Promise<T> {
        return apiFetch(path, {
            method: "PUT",
            body: body === undefined ? undefined : JSON.stringify(body),
        }).then(parse<T>);
    },

    patch<T>(path: string, body?: unknown): Promise<T> {
        return apiFetch(path, {
            method: "PATCH",
            body: body === undefined ? undefined : JSON.stringify(body),
        }).then(parse<T>);
    },

    delete<T>(path: string): Promise<T> {
        return apiFetch(path, { method: "DELETE" }).then(parse<T>);
    },
};
