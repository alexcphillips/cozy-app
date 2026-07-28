import { useUIStore } from "../stores/ui/ui.store";
import type { GameAction } from "../stores/ui/ui.types";

export function useGameActions() {
    const openMenu = useUIStore((s) => s.openMenu);
    const openHotspot = useUIStore((s) => s.openHotspot);
    const closePanel = useUIStore((s) => s.closePanel);

    function dispatch(action: GameAction) {
        switch (action.type) {
            case "OPEN_MENU":
                openMenu(action.panel);
                break;

            case "OPEN_HOTSPOT":
                openHotspot(action.panel);
                break;

            case "START_RUN":
                console.log("start run:", action.runType);
                break;

            case "CLOSE_UI":
                closePanel();
                break;

            case "SEND_SOCKET_EVENT":
                console.log("socket:", action.event, action.payload);
                break;
        }
    }

    return dispatch;
}
