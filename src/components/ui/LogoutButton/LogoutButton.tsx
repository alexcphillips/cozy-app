import { useNavigate } from "react-router-dom";
import styles from "./LogoutButton.module.css";
import { useAuthStore } from "../../../store/auth";

type LogoutButtonProps = { redirectDestination?: string };

export default function LogoutButton({
    redirectDestination = "/",
}: LogoutButtonProps) {
    const navigate = useNavigate();
    const logout = useAuthStore((s) => s.logout);

    function handleLogout() {
        logout();
        navigate(redirectDestination);
    }

    return (
        <button className={styles["logout-button"]} onClick={handleLogout}>
            Logout
        </button>
    );
}
