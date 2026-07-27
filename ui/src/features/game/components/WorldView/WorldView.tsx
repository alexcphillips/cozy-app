import styles from "./WorldView.module.css";
import worldMap from "../../../../assets/game/world-map.png";
import { useUIStore } from "../../stores/ui/ui.store";
import type { HotspotView } from "../../stores/ui/ui.types";

type Hotspot = {
    id: string;
    left: string;
    top: string;
    width: string;
    height: string;
    zIndex?: number;
    panel: HotspotView;
};

const hotspots: Hotspot[] = [
    {
        id: "castle",
        left: "0",
        top: "0",
        width: "28%",
        height: "34%",
        panel: "castle",
    },
    {
        id: "forest",
        left: "28%",
        top: "0",
        width: "55%",
        height: "30%",
        panel: "forest",
    },
    {
        id: "tower",
        left: "84%",
        top: "0",
        width: "12%",
        height: "30%",
        panel: "tower",
        zIndex: 10,
    },
    {
        id: "bonfire",
        left: "44%",
        top: "9%",
        width: "11%",
        height: "15%",
        zIndex: 10,
        panel: "bonfire",
    },
    {
        id: "portal",
        left: "59%",
        top: "7%",
        width: "8%",
        height: "13%",
        zIndex: 10,
        panel: "portal",
    },
    {
        id: "port",
        left: "64%",
        top: "50%",
        width: "33%",
        height: "48%",
        panel: "port",
    },
    {
        id: "mine",
        left: "0",
        top: "71%",
        width: "30%",
        height: "29%",
        panel: "mine",
    },
    {
        id: "farm",
        left: "0",
        top: "37%",
        width: "36%",
        height: "34%",
        panel: "farm",
    },
    {
        id: "town",
        left: "38%",
        top: "33%",
        width: "26%",
        height: "41%",
        zIndex: 10,
        panel: "town",
    },
];

export default function WorldView() {
    const openHotspot = useUIStore((s) => s.openHotspot);

    return (
        <div className={styles["world"]}>
            <img src={worldMap} alt="World Map" className={styles.map} />

            {hotspots.map((h) => (
                <button
                    key={h.id}
                    className={styles.hotspot}
                    onClick={() => openHotspot(h.panel)}
                    style={{
                        left: h.left,
                        top: h.top,
                        width: h.width,
                        height: h.height,
                        zIndex: h.zIndex ?? 1,
                    }}
                />
            ))}
        </div>
    );
}
