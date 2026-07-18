import { useGameActions } from "../../../../actions/useGameActions";

export default function PortContent() {
    const dispatch = useGameActions();

    return (
        <>
            <button
                onClick={() =>
                    dispatch({ type: "OPEN_HOTSPOT", panel: "port_fishing" })
                }
            >
                Fishing
            </button>
        </>
    );
}
