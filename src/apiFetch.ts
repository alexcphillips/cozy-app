import { useAuthStore } from "./store/auth";

export async function apiFetch(url: string, options: RequestInit = {}) {
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

    const baseUrl = apiUrl.replace(/\/$/, "");
    const formattedUrl = url.startsWith("/") ? url : `/${url}`;

    const token = useAuthStore.getState().token;

    return fetch(`${baseUrl}${formattedUrl}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token && {
                Authorization: `Bearer ${token}`,
            }),
            ...options.headers,
        },
    });
}
