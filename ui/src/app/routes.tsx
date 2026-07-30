import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../layouts/AppLayout/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import RouteAnalyticsTracker from "@/app/RouteAnalyticsTracker";
import { ROUTES } from "./routes.paths";

import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import Home from "../features/home/pages/Home";
import CozyCare from "../features/diet/pages/CozyCare";
import Library from "../features/library/pages/Library";
import Game from "../features/game/pages/Game";
import Profile from "../features/profile/pages/Profile";
import Admin from "@/features/admin/pages/Admin";

/**
 * THE route manifest - the client-side mirror of `server/src/routes.ts`.
 * Every screen the app can show is listed here exactly once, so this file
 * answers "what pages exist, and which are behind a login?".
 *
 * Adding a page:
 *   1. create it under `features/<feature>/pages/`
 *   2. add its URL to `routes.paths.ts`
 *   3. add one `<Route>` below, inside or outside `<ProtectedRoute>`
 */
export function AppRoutes() {
    return (
        <>
            <RouteAnalyticsTracker />
            <Routes>
                {/* Public */}
                <Route path={ROUTES.login} element={<Login />} />
                <Route path={ROUTES.register} element={<Register />} />

                {/* Authenticated */}
                <Route element={<ProtectedRoute />}>
                    <Route path={ROUTES.home} element={<AppLayout />}>
                        <Route index element={<Home />} />
                        <Route path={ROUTES.cozyCare} element={<CozyCare />} />
                        <Route path={ROUTES.library} element={<Library />} />
                        <Route path={ROUTES.game} element={<Game />} />
                        <Route path={ROUTES.profile} element={<Profile />} />

                        <Route element={<AdminRoute />}>
                            <Route path={ROUTES.admin} element={<Admin />} />
                        </Route>
                    </Route>
                </Route>

                {/* Send the user home rather than showing nothing. */}
                <Route
                    path="*"
                    element={<Navigate to={ROUTES.home} replace />}
                />
            </Routes>
        </>
    );
}
