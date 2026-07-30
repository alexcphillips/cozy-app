import styles from "./Navbar.module.css";
import { navItems } from "./navbar.items";
import NavbarItem from "./NavItem";
import ProfileButton from "../../features/profile/components/ProfileButton/ProfileButton";
import { useAuthStore } from "../../features/auth/stores/auth.store";
import LogoutButton from "../../features/auth/components/LogoutButton/LogoutButton";
import AppTitle from "../../components/AppTitle/AppTitle";
import LoginButton from "../../features/auth/components/LoginButton/LoginButton";
import AdminLink from "@/features/admin/components/AdminLink/AdminLink";

export function Navbar() {
    const isGameRoute = location.pathname.startsWith("/game");
    const isLoggedIn = useAuthStore((s) => s.isAuthenticated);
    const isAdmin = useAuthStore((s) => s.isAdmin);

    const leftLinks = navItems.filter((item) => !item.path.startsWith("http"));

    return (
        !isGameRoute && (
            <div className={styles["navbar"]}>
                <AppTitle text={"Very Cool Web Application"} />

                <div className={styles["links-container"]}>
                    {leftLinks.map((item) => (
                        <NavbarItem key={item.label} {...item} />
                    ))}

                    <div className={`${styles["right-links-container"]}`}>
                        {isAdmin ? <AdminLink /> : ""}
                        {isLoggedIn ? (
                            <>
                                <LogoutButton />
                                <ProfileButton />
                            </>
                        ) : (
                            <LoginButton />
                        )}
                    </div>
                </div>
            </div>
        )
    );
}
