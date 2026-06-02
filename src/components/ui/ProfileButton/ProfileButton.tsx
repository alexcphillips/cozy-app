import { Link } from "react-router-dom";
import styles from "./ProfileButton.module.css";

export default function ProfileButton() {
    return (
        <div className={styles["profile-container"]}>
            <Link className={styles["profile-circle"]} to={"/profile"}>
                <img
                    className={styles["profile-image"]}
                    src="/profile.jpeg"
                    alt="Profile"
                ></img>
            </Link>
        </div>
    );
}
