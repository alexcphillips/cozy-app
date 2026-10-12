import { useEffect } from "react";

let lockCount = 0;

/**
 * Locks body scroll for as long as the caller is mounted. Ref-counted, so when
 * two drawers overlap the body stays locked until the last one unmounts.
 */
export function useBodyScrollLock() {
    useEffect(() => {
        lockCount += 1;
        document.body.classList.add("global-body-fixed");

        return () => {
            lockCount -= 1;
            if (lockCount === 0) {
                document.body.classList.remove("global-body-fixed");
            }
        };
    }, []);
}
