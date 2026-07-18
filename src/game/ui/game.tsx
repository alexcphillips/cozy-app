import ActionBar from "../components/ActionBar/ActionBar";
import ChatSection from "../components/ChatSection/ChatSection";
import AchievementsPanel from "../components/PanelLayer/PlayerUI/AchievementsPanel/AchievementsPanel";
import DeckPanel from "../components/PanelLayer/PlayerUI/DeckPanel/DeckPanel";
import InventoryPanel from "../components/PanelLayer/PlayerUI/InventoryPanel/InventoryPanel";
import SettingsPanel from "../components/PanelLayer/PlayerUI/SettingsPanel/SettingsPanel";
import SkillsPanel from "../components/PanelLayer/PlayerUI/SkillsPanel/SkillsPanel";
import Sidebar from "../components/Sidebar/Sidebar";
import WorldView from "../components/WorldView/WorldView";
import HotspotPanel from "../components/PanelLayer/HotspotPanel/HotspotPanel";
import HelpPanel from "../components/PanelLayer/PlayerUI/HelpPanel/HelpPanel";

import { useHotkeys } from "../hooks/useHotkeys";
import { useUIStore } from "../stores/ui/ui.store";
import type { MenuPanel } from "../stores/ui/ui.types";

import type { ReactNode } from "react";
import styles from "./game.module.css";
// import Panel from "../components/PanelLayer/Panel/Panel";

const menuPanels: Record<MenuPanel, ReactNode> = {
    inventory: <InventoryPanel />,
    skills: <SkillsPanel />,
    deck: <DeckPanel />,
    settings: <SettingsPanel />,
    achievements: <AchievementsPanel />,
    help: <HelpPanel />,
};

export default function Game() {
    useHotkeys();
    const activePanel = useUIStore((s) => s.activePanel);

    return (
        <div className={styles["game-container"]}>
            <div className={styles["layout"]}>
                <Sidebar />
                <div className={styles["world-stage"]}>
                    <WorldView />

                    {/* Panels */}
                    {activePanel?.kind === "menu" &&
                        menuPanels[activePanel.panel]}

                    {activePanel?.kind === "hotspot" && (
                        <HotspotPanel panel={activePanel.panel} />
                    )}

                    <ChatSection />
                    <ActionBar />
                </div>
            </div>
        </div>
    );
}
