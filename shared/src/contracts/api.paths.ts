/**
 * THE map between client and server. Every HTTP path in this codebase is
 * declared exactly once, here.
 *
 * - `server/src/routes.ts` mounts handlers against these patterns.
 * - `ui/src/features/<feature>/api/*.api.ts` calls them via `buildPath`.
 *
 * If you are looking for "where does this URL go?", grep the constant name -
 * it appears on both sides.
 */
export const API_PATHS = {
    auth: {
        register: "/register",
        login: "/login",
    },
    users: {
        list: "/users",
        byEmail: "/user/:email",
        byId: "/user/:id",
    },
    analytics: {
        event: "/event", // Record an event
        events: "/events", // Fetch recorded events
    },
    diet: {
        weightEntries: "/weight-entries",
        foodLog: "/food-log",
        foodLogItem: "/food-log/:itemId",
        foodItems: "/food-items",
        foodItems_create: "/food-entry",
    },
    books: {
        search: "/book",
    },
} as const;

/**
 * Fills `:param` placeholders in an {@link API_PATHS} pattern.
 * Values are URI-encoded, so callers pass raw values.
 */
export function buildPath(
    pattern: string,
    params: Record<string, string | number> = {},
): string {
    return pattern.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => {
        const value = params[key];

        if (value === undefined) {
            throw new Error(
                `buildPath: missing param ":${key}" for ${pattern}`,
            );
        }

        return encodeURIComponent(String(value));
    });
}
