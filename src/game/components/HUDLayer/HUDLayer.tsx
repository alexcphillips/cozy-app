import { useGameStore } from "../../stores/game.store";
import styles from "./HUDLayer.module.css";

// import FishingHUD from "./FishingHUD";
// import CombatHUD from "./CombatHUD";
// import MiningHUD from "./MiningHUD";

const HUD_REGISTRY: Record<string, any> = {
    // fishing: FishingHUD,
    // combat: CombatHUD,
    // mining: MiningHUD,
};

export default function HUDLayer() {
    const mode = useGameStore((s) => s.mode);

    if (!mode) return null;

    const HUDComponent = HUD_REGISTRY[mode];

    if (!HUDComponent) return null;

    return (
        <div className={styles["hud-layer"]}>
            <HUDComponent />
        </div>
    );
}
