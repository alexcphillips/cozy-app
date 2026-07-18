import { useEffect } from "react";
import { useUIStore } from "../stores/ui/ui.store";

export function useHotkeys() {
    const openPanel = useUIStore((s) => s.openPanel);
    const closePanel = useUIStore((s) => s.closePanel);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const hotkeyMap: Record<string, () => void> = {
                i: () => openPanel("inventory"),
                k: () => openPanel("skills"),
                d: () => openPanel("deck"),
                h: () => openPanel("help"),
                escape: () => closePanel(),
            };

            hotkeyMap[event.key.toLowerCase()]?.();
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [openPanel, closePanel]);
}
