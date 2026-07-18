import { useGameActions } from "../../../../actions/useGameActions";
import styles from "./PortalContent.module.css";

export default function PortalContent() {
    const dispatch = useGameActions();

    return (
        <div className={styles["actions-grid"]}>
            <button
                onClick={() => dispatch({ type: "START_RUN", runType: "test" })}
            >
                Winding Path
            </button>
        </div>
    );
}
