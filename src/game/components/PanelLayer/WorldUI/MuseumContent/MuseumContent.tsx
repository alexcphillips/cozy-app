import { useGameActions } from "../../../../actions/useGameActions";
import Panel from "../../Panel/Panel";
import styles from "./Town.module.css";

const data = {
    title: "Town",
    options: [
        {
            label: "Museum",
            action: {
                type: "OPEN_HOTSPOT",
                panel: "museum",
            },
        },
        {
            label: "Guild Hall",
            action: {
                type: "OPEN_HOTSPOT",
                panel: "guild_hall",
            },
        },
        {
            label: "Bank",
            action: {
                type: "OPEN_HOTSPOT",
                panel: "bank",
            },
        },
        {
            label: "Auction House",
            action: {
                type: "OPEN_HOTSPOT",
                panel: "auction_house",
            },
        },
        {
            label: "Community Center",
            action: {
                type: "OPEN_HOTSPOT",
                panel: "community_center",
            },
        },
    ],
} as const;

export default function TownPanel() {
    const dispatch = useGameActions();

    if (!data) return null;

    return (
        <Panel size="medium" title={data.title}>
            <div className={styles.content}>
                {data.options.map((opt) => (
                    <button
                        key={opt.label}
                        onClick={() => dispatch(opt.action)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </Panel>
    );
}
