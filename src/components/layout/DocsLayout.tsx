import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar/Navbar";
import styles from "./DocsLayout.module.css";
import SideNav from "./SideNav/SideNav";

const pathsNoSidenav = ["/game"];

export default function DocsLayout() {
    const location = useLocation();

    const isGameRoute = location.pathname.startsWith("/game");
    const showSideNav = !pathsNoSidenav.includes(location.pathname);

    return (
        <div className={styles.container}>
            <Navbar />

            <main
                className={`${styles.content} ${
                    isGameRoute ? styles.gameMode : styles.pageMode
                }`}
            >
                {showSideNav && <SideNav />}

                <Outlet />
            </main>
        </div>
    );
}
