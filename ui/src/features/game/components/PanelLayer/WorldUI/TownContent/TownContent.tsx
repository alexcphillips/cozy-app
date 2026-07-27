import { useGameActions } from "../../../../actions/useGameActions";
import styles from "./TownContent.module.css";

export default function TownContent() {
    const dispatch = useGameActions();

    return (
        <>
            <button
                className={styles["community-center"]}
                onClick={() =>
                    dispatch({
                        type: "OPEN_HOTSPOT",
                        panel: "community_center",
                    })
                }
            >
                Community Center
            </button>

            <button
                className={styles["museum"]}
                onClick={() =>
                    dispatch({
                        type: "OPEN_HOTSPOT",
                        panel: "museum",
                    })
                }
            >
                Museum
            </button>

            <button
                className={styles["bank"]}
                onClick={() =>
                    dispatch({
                        type: "OPEN_HOTSPOT",
                        panel: "bank",
                    })
                }
            >
                Bank
            </button>

            <button
                className={styles["guild-hall"]}
                onClick={() =>
                    dispatch({
                        type: "OPEN_HOTSPOT",
                        panel: "guild_hall",
                    })
                }
            >
                Guild Hall
            </button>

            <button
                className={styles["auction-house"]}
                onClick={() =>
                    dispatch({
                        type: "OPEN_HOTSPOT",
                        panel: "auction_house",
                    })
                }
            >
                Auction House
            </button>
        </>
    );
}
