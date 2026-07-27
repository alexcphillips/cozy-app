import { MdEdit } from "react-icons/md";
import LineGraph from "../../../components/Graphs/LineGraph";
import styles from "./DietTracker.module.css";
import "../../../app/styles/globals.css";
import { useWeightData } from "../hooks/useWeightData";

export default function DietTracker() {
    // All weight fetching/derivation lives in the hook, shared with CozyCare.
    const {
        weightEntries,
        weightEntryValue,
        setWeightEntryValue,
        weightEntryError,
        computedChartData,
        handleAddEntry,
    } = useWeightData();

    function handleRowEditClick() {}

    const weightChartData = {
        labels: computedChartData.labels,
        datasets: [
            {
                label: "Weight (lbs)",
                data: computedChartData.values,
                borderColor: "rgba(244, 129, 248, 0.5)",
                tension: 0,
                fill: true,
                backgroundColor: "rgba(251, 149, 255, 0.5)",
            },
        ],
    };

    return (
        <div className={styles["page-container"]}>
            <div className={styles["weight-section"]}>
                <div className={styles["weight-entries-list"]}>
                    <div className={styles["create-weight-entry-row"]}>
                        <form
                            onSubmit={handleAddEntry}
                            noValidate
                            autoComplete="off"
                        >
                            <label
                                className="screen-reader-only"
                                htmlFor="create-weight-entry-input"
                            >
                                Input weight:
                            </label>
                            <input
                                className={styles["create-weight-entry-input"]}
                                id="create-weight-entry-input"
                                placeholder="Today's weight:"
                                value={weightEntryValue}
                                onChange={(e) =>
                                    setWeightEntryValue(e.target.value)
                                }
                            />
                        </form>

                        {weightEntryError && <p>{weightEntryError}</p>}
                    </div>

                    {weightEntries.map((entry, i) => (
                        <div
                            className={styles["weight-entry-row"]}
                            key={`${entry.created_at}-${i}`}
                        >
                            <div className={styles["weight-entry-date"]}>
                                {new Date(entry.created_at).toLocaleDateString(
                                    "en-US",
                                )}
                            </div>

                            <div className={styles["weight-entry-value"]}>
                                {entry.weight} lbs
                            </div>

                            <div className={styles["weight-row-actions"]}>
                                <div
                                    className={styles["weight-row-action-edit"]}
                                    onClick={handleRowEditClick}
                                >
                                    <MdEdit />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles["weight-graph"]}>
                    <LineGraph
                        titleText="Weight Trend"
                        chartData={weightChartData}
                    />
                </div>
            </div>

            <div className={styles["diet-section"]}>Diet Section</div>
        </div>
    );
}
