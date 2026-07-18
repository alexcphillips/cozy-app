import { useGameStore } from "../../stores/game.store";
import styles from "./HUDLayer.module.css";

// import FishingHUD from "./FishingHUD";
// import CombatHUD from "./CombatHUD";
// import MiningHUD from "./MiningHUD";

export const HUD_REGISTRY = {
    // fishing: FishingHUD,
    // combat: CombatHUD,
    // mining: MiningHUD,
} as const;

export default function HUDLayer() {
    const mode = useGameStore((s) => s.mode);

    const HUDComponent = HUD_REGISTRY[mode];

    if (!HUDComponent) return null;

    return (
        <div className={styles["hud-layer"]}>
            <HUDComponent />
        </div>
    );
}
