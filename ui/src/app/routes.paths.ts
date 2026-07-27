/**
 * Every client-side URL, declared once. `routes.tsx` mounts them and components
 * navigate with them, so renaming a URL is a single edit that the compiler
 * propagates to every `navigate()` and `<Link>` in the app.
 */
export const ROUTES = {
    home: "/",
    login: "/login",
    register: "/register",
    profile: "/profile",
    cozyCare: "/cozy-care",
    dietTracker: "/diet-tracker",
    library: "/library",
    game: "/game",
    docsTable: "/components/table",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
