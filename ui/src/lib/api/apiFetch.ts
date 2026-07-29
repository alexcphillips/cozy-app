import { useAuthStore } from "../../features/auth/stores/auth.store";

const API_BASE_URL: string =
    import.meta.env.VITE_API_URL ?? "http://localhost:8080";

/**
 * The transport: prefixes the API origin and attaches the bearer token. Returns
 * the raw `Response` and throws only on network failure.
 *
 * Prefer the typed helpers in `./client` for JSON endpoints; reach for this
 * directly only when you need the `Response` itself (file uploads, streaming).
 */
export async function apiFetch(
    path: string,
    options: RequestInit = {},
): Promise<Response> {
    const formattedPath = path.startsWith("/") ? path : `/${path}`;
    const token = useAuthStore.getState().token;

    const isFormData = options.body instanceof FormData;

    return fetch(`${API_BASE_URL}${formattedPath}`, {
        ...options,
        headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
}
