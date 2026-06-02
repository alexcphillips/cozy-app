import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar/Navbar";
import styles from "./DocsLayout.module.css";
import SideNav from "./SideNav/SideNav";

export default function DocsLayout() {
    return (
        <div className={styles.container}>
            <Navbar />
            <main className={styles.content}>
                <SideNav />
                <Outlet />
            </main>
        </div>
    );
}
