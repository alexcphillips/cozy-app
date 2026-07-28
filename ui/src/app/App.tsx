import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import "./styles/globals.css";

/**
 * Application root: global providers only. What the app *contains* is in
 * `routes.tsx`; how each screen looks is in `layouts/` and `features/`.
 */
export function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}
