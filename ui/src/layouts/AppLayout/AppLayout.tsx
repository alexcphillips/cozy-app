import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "../Navbar/Navbar";
import styles from "./AppLayout.module.css";
import { ROUTES } from "@/app/routes.paths";

export default function AppLayout() {
    const location = useLocation();

    const isGameRoute = location.pathname.startsWith(ROUTES.game);

    return (
        <div className={styles.container}>
            <Navbar />

            <main
                className={`${styles.content} ${
                    isGameRoute ? styles.gameMode : styles.pageMode
                }`}
            >
                <Outlet />
            </main>
        </div>
    );
}
