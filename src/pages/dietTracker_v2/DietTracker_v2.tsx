import { useEffect, useState } from "react";
import LineGraph from "../../components/ui/Graphs/LineGraph";
import { stringIsOnlyNumberOrFloat } from "../../utils/stringIsOnlyNumberOrFloat";
import styles from "./dietTracker_v2.module.css";
import "../../globals.css";
import { apiFetch } from "../../apiFetch";
import getCurrentStringMonth from "../../utils/getCurrentStringMonth";

/* eslint-disable react-hooks/set-state-in-effect */

type WeightEntry = {
    weight: number;
    created_at: string;
};

export default function DietTrackerV2() {
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

    function calculateWeightProgressThisMonth(entries: WeightEntry[]) {
        const now = new Date();

        const currentMonthEntries = entries.filter((entry) => {
            const date = new Date(entry.created_at);

            return (
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear()
            );
        });

        if (currentMonthEntries.length < 2) {
            return 0;
        }

        const newestWeight = currentMonthEntries[0].weight;
        const oldestWeight =
            currentMonthEntries[currentMonthEntries.length - 1].weight;

        return newestWeight - oldestWeight;
    }

    const chartLabels = weightEntries.map((entry) =>
        new Date(entry.created_at).toLocaleDateString("en-US"),
    );

    const chartValues = weightEntries.map((entry) => entry.weight);

    const highestWeightInMonth = Math.max(...chartValues);
    const LowestWeightInMonth = Math.min(...chartValues);

    const weightProgressThisMonth =
        calculateWeightProgressThisMonth(weightEntries);

    const weightChartData = {
        labels: chartLabels,
        datasets: [
            {
                label: "Weight (lbs)",
                data: chartValues.reverse(),
                pointStyle: "rectRounded",
                pointRadius: 6,
                pointBackgroundColor: "#fbcfe8",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                borderColor: "rgba(244, 129, 248, 0.5)",
                tension: 0,
                fill: true,
                backgroundColor: "rgba(255, 149, 248, 0.5)",
            },
        ],
    };

    return (
        <div className={styles["page"]}>
            <div className={styles["weight-section"]}>
                <div className={styles["weight-progress-section"]}>
                    <div className={styles["weight-progress-header"]}>
                        Weight Progress
                    </div>

                    <div
                        className={styles["weight-progress-this-month"]}
                    >{`This Month: ${weightProgressThisMonth > 0 ? "+" : ""}${weightProgressThisMonth.toFixed(1)} lbs`}</div>
                    <img
                        className={styles["weight-progress-image"]}
                        src="/apple-scale.png"
                    />
                </div>

                <div className={styles["weight-chart"]}>
                    <LineGraph
                        titleText={`Your Weight Journey (${getCurrentStringMonth()})`}
                        chartData={weightChartData}
                        maxValue={highestWeightInMonth}
                        minValue={LowestWeightInMonth}
                    />
                </div>

                <div className={styles["weight-input-section"]}>
                    <form autoComplete="off" onSubmit={handleWeightEntrySubmit}>
                        <label
                            className={styles["weight-input-label"]}
                            htmlFor="weight-input"
                        >
                            Record Today's Weight
                        </label>
                        <input
                            className={styles["weight-input"]}
                            id="weight-input"
                            value={weightEntryValue}
                            placeholder="lbs:"
                            onChange={(e) =>
                                setWeightEntryValue(e.target.value)
                            }
                        />
                        <button
                            className={styles["weight-submit-button"]}
                            type="submit"
                        >
                            Add
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
