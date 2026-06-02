import { useAuthStore } from "./store/auth";

export async function apiFetch(url: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().token;

    return fetch(url, {
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
