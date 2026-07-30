import AdminDashboard from "../components/AdminDashboard/AdminDashboard";
import styles from "./Admin.module.css";

export default function Admin() {
    return (
        <div className={styles["admin-page"]}>
            <AdminDashboard />
        </div>
    );
}
