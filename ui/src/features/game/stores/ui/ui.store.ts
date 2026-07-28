import { create } from "zustand";
import type { ActivePanel, MenuPanel, HotspotView } from "./ui.types";

type UIStore = {
    activePanel: ActivePanel;

    openMenu: (panel: MenuPanel) => void;
    openHotspot: (panel: HotspotView) => void;

    closePanel: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
    activePanel: null,

    openMenu: (panel) =>
        set({
            activePanel: {
                kind: "menu",
                panel,
            },
        }),

    openHotspot: (panel) =>
        set({
            activePanel: {
                kind: "hotspot",
                panel,
            },
        }),

    closePanel: () =>
        set({
            activePanel: null,
        }),
}));
