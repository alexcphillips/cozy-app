import { NavLink } from "react-router-dom";
import styles from "./NavItem.module.css";

export interface NavItemProps {
    label: string;
    path: string;
}

export default function NavbarItem({ label, path }: NavItemProps) {
    if (path.startsWith("http")) {
        return (
            <a
                href={path}
                className={`${styles["link"]} ${styles["external-link"]}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                {label}
            </a>
        );
    }

    return (
        <NavLink
            to={path}
            className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : `${styles.link}`
            }
        >
            {label}
        </NavLink>
    );
}
