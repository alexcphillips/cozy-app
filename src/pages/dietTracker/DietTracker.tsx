import { useEffect, useState } from "react";
import { MdEdit } from "react-icons/md";
import LineGraph from "../../components/ui/Graphs/LineGraph";
import { stringIsOnlyNumberOrFloat } from "../../utils/stringIsOnlyNumberOrFloat";
import styles from "./DietTracker.module.css";
import "../../globals.css";
import { apiFetch } from "../../apiFetch";

/* eslint-disable react-hooks/set-state-in-effect */

type WeightEntry = {
    weight: number;
    created_at: string;
};

export default function DietTracker() {
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [weightEntryValue, setWeightEntryValue] = useState("");
    const [weightEntryError, setWeightEntryError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function loadWeightEntries() {
        const response = await apiFetch("/api/weight-entries");

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        setWeightEntries(data);
    }

    useEffect(() => {
        loadWeightEntries();
    }, []);

    function handleRowEditClick() {}

    const chartLabels = weightEntries.map((entry) =>
        new Date(entry.created_at).toLocaleDateString("en-US"),
    );

    const chartValues = weightEntries.map((entry) => entry.weight);

    const weightChartData = {
        labels: chartLabels,
        datasets: [
            {
                label: "Weight (lbs)",
                data: chartValues.reverse(),
                borderColor: "rgba(244, 129, 248, 0.5)",
                tension: 0,
                fill: true,
                backgroundColor: "rgba(251, 149, 255, 0.5)",
            },
        ],
    };

    async function handleWeightEntrySubmit(
        e: React.SyntheticEvent<HTMLFormElement>,
    ) {
        e.preventDefault();
        setWeightEntryError("");

        if (!stringIsOnlyNumberOrFloat(weightEntryValue)) {
            setWeightEntryError("Invalid weight");
            return;
        }

        setIsLoading(true);

        const response = await apiFetch("/api/weight-entries", {
            method: "POST",
            body: JSON.stringify({
                weight: Number(weightEntryValue),
            }),
        });

        setIsLoading(false);

        if (!response.ok) {
            setWeightEntryError("Invalid weight or api error");
            return;
        }

        const newEntry = await response.json();

        setWeightEntries((current) => [...newEntry, ...current]);

        setWeightEntryValue("");
        setWeightEntryError("");
    }

    return (
        <div className={styles["page-container"]}>
            <div className={styles["weight-section"]}>
                <div className={styles["weight-entries-list"]}>
                    <div className={styles["create-weight-entry-row"]}>
                        <form
                            onSubmit={handleWeightEntrySubmit}
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
