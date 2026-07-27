import { useUIStore } from "../../../../stores/ui/ui.store";
import SidebarButton from "./Button/Button";
import styles from "./ButtonsSection.module.css";
import { FaCog } from "react-icons/fa";
import { TbPlayCardStarFilled } from "react-icons/tb";
import { PiTreasureChestFill } from "react-icons/pi";
import { IoMdHelpCircle } from "react-icons/io";
import { FaTrophy } from "react-icons/fa6";
import type { ReactNode } from "react";
import type { ActivePanel, MenuPanel } from "../../../../stores/ui/ui.types";

export default function ButtonsSection() {
    const openMenu = useUIStore((s) => s.openMenu);

    const sidebarButtons: {
        id: string;
        icon: ReactNode;
        panel: ActivePanel;
    }[] = [
        {
            id: "settings",
            icon: <FaCog />,
            panel: { kind: "menu", panel: "settings" },
        },
        {
            id: "inventory",
            icon: <PiTreasureChestFill />,
            panel: { kind: "menu", panel: "inventory" },
        },
        {
            id: "deck",
            icon: <TbPlayCardStarFilled />,
            panel: { kind: "menu", panel: "deck" },
        },
        {
            id: "help",
            icon: <IoMdHelpCircle />,
            panel: { kind: "menu", panel: "help" },
        },
        {
            id: "achievements",
            icon: <FaTrophy />,
            panel: { kind: "menu", panel: "achievements" },
        },
    ];

    return (
        <div className={styles["buttons-section"]}>
            {sidebarButtons.map((sidebarButtonData) => (
                <SidebarButton
                    key={sidebarButtonData.id}
                    onClick={() =>
                        openMenu(sidebarButtonData.panel!.panel as MenuPanel)
                    }
                    icon={sidebarButtonData.icon}
                />
            ))}
        </div>
    );
}
