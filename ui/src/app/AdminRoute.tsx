import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "./routes.paths";
import { useAuthStore } from "@/features/auth/stores/auth.store";

export default function AdminRoute() {
    const isAdmin = useAuthStore((state) => state.isAdmin);

    if (!isAdmin) {
        return <Navigate to={ROUTES.home} replace />;
    }

    return <Outlet />;
}
