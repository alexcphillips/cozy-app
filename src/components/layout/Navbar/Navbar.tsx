import styles from "./Navbar.module.css";
import { navItems } from "../../../config/navbarData";
import NavbarItem from "./NavItem";
import ProfileButton from "../../ui/ProfileButton/ProfileButton";
import { useAuthStore } from "../../../store/auth";
import LogoutButton from "../../ui/LogoutButton/LogoutButton";
import AppTitle from "../../ui/AppTitle/AppTitle";
import LoginButton from "../../ui/LoginButton/LoginButton";

export function Navbar() {
    const isLoggedIn = useAuthStore((s) => s.isAuthenticated);

    const leftLinks = navItems.filter((item) => !item.path.startsWith("http"));

    return (
        <div className={styles["navbar"]}>
            <AppTitle text={"Very Cool Web Application"} />

            <div className={styles["links-container"]}>
                {leftLinks.map((item) => (
                    <NavbarItem key={item.label} {...item} />
                ))}

                <div className={`${styles["right-links-container"]}`}>
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
    );
}
