import { useGameActions } from "../../../../actions/useGameActions";

export default function CastleContent() {
    const dispatch = useGameActions();

    return (
        <>
            <button
                onClick={() =>
                    dispatch({ type: "OPEN_HOTSPOT", panel: "castle_dungeons" })
                }
            >
                Dungeons
            </button>
        </>
    );
}
