import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Makes `containerRef` behave like a modal dialog: focus moves inside on mount,
 * Tab cycles within it, Escape calls `onEscape`, and focus returns to whatever
 * was focused before on unmount.
 */
export function useFocusTrap(
    containerRef: RefObject<HTMLElement | null>,
    onEscape: () => void,
) {
    // Kept in a ref so a new `onEscape` identity each render doesn't re-run the
    // effect below — re-running it would yank focus back to the first field
    // mid-typing.
    const onEscapeRef = useRef(onEscape);
    useEffect(() => {
        onEscapeRef.current = onEscape;
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        function focusableElements(root: HTMLElement) {
            return Array.from(
                root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            ).filter((element) => element.offsetParent !== null);
        }

        (focusableElements(container)[0] ?? container).focus();

        // An arrow const rather than a hoisted `function`, so TS keeps the
        // non-null narrowing of `container` inside the closure.
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onEscapeRef.current();
                return;
            }

            if (e.key !== "Tab") return;

            const elements = focusableElements(container);
            const first = elements[0];
            const last = elements[elements.length - 1];

            if (!first || !last) {
                e.preventDefault();
                return;
            }

            const active = document.activeElement;

            if (e.shiftKey && (active === first || active === container)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };

        container.addEventListener("keydown", handleKeyDown);

        return () => {
            container.removeEventListener("keydown", handleKeyDown);
            previouslyFocused?.focus();
        };
    }, [containerRef]);
}
