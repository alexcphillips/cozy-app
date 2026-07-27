import { useAuthStore } from "./store/auth";

export async function apiFetch(url: string, options: RequestInit = {}) {
    const baseURL = import.meta.env.VITE_API_URL || "";
    console.log("baseURL?:", !!baseURL);
    let cleanUrl = url;

    if (baseURL) {
        cleanUrl = url.replace(/^\/?api/, "");
    }

    const formattedUrl = cleanUrl.startsWith("/") ? cleanUrl : `/${cleanUrl}`;
    const completeTargetUrl = `${baseURL}${formattedUrl}`;

    const token = useAuthStore.getState().token;

    return fetch(completeTargetUrl, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    });
}
