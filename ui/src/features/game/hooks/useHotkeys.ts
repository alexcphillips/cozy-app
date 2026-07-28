import { useEffect } from "react";
import { useUIStore } from "../stores/ui/ui.store";

export function useHotkeys() {
    const openMenu = useUIStore((s) => s.openMenu);
    const closePanel = useUIStore((s) => s.closePanel);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const hotkeyMap: Record<string, () => void> = {
                i: () => openMenu("inventory"),
                k: () => openMenu("skills"),
                d: () => openMenu("deck"),
                h: () => openMenu("help"),
                escape: () => closePanel(),
            };

            hotkeyMap[event.key.toLowerCase()]?.();
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [openMenu, closePanel]);
}
