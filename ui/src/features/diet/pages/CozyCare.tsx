import LineGraph from "../../../components/Graphs/LineGraph";
import getCurrentStringMonth from "../../../utils/getCurrentStringMonth";
import FoodLogSection from "../components/FoodLogSection/FoodLogSection";
import WeightProgressCard from "../components/WeightProgressCard/WeightProgressCard";
import WeightInputForm from "../components/WeightInputForm/WeightInputForm";
import { useWeightData } from "../hooks/useWeightData";
import styles from "./CozyCare.module.css";

export default function CozyCare() {
    const {
        weightEntryValue,
        setWeightEntryValue,
        weightEntryError,
        isLoading,
        computedChartData,
        progressThisMonth,
        handleAddEntry,
    } = useWeightData();

    const weightChartData = {
        labels: computedChartData.labels,
        datasets: [
            {
                label: "Weight (lbs)",
                data: computedChartData.values,
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
            <div
                className={`${styles["weight-section"]} ${styles["page-section"]}`}
            >
                <WeightProgressCard progress={progressThisMonth} />

                <div className={styles["weight-chart"]}>
                    <LineGraph
                        titleText={`Your Weight Journey (${getCurrentStringMonth()})`}
                        chartData={weightChartData}
                        maxValue={computedChartData.max}
                        minValue={computedChartData.min}
                    />
                </div>

                <WeightInputForm
                    value={weightEntryValue}
                    error={weightEntryError}
                    isLoading={isLoading}
                    onChange={setWeightEntryValue}
                    onSubmit={handleAddEntry}
                />
            </div>

            <div className={styles["page-section"]}>
                <FoodLogSection />
            </div>
        </div>
    );
}
