import { useGameActions } from "../../../../actions/useGameActions";

export default function CastleDungeonsContent() {
    const dispatch = useGameActions();

    return (
        <>
            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_CASTLE_CELLARS",
                    })
                }
            >
                Castle Cellars
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_THE_CATACOMBS",
                    })
                }
            >
                The Catacombs
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_SIEGRICS_REST",
                    })
                }
            >
                Siegric's Rest
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_ASH_PRISON",
                    })
                }
            >
                Ash Prison
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_BURNING_SEPULCHER",
                    })
                }
            >
                Burning Sepulcher
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_FLOODED_NEST",
                    })
                }
            >
                Flooded Nest
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_CHAMBER_OF_GOLD",
                    })
                }
            >
                Chamber of Gold
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_HALLS_OF_AGONY",
                    })
                }
            >
                Halls of Agony
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_DEATHS_EMBRACE",
                    })
                }
            >
                Death's Embrace
            </button>

            <button
                onClick={() =>
                    dispatch({
                        type: "START_RUN",
                        runType: "START_PIT_OF_DESPAIR",
                    })
                }
            >
                Pit of Despair
            </button>
        </>
    );
}
