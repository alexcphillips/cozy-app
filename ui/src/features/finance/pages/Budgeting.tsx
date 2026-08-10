import StackedBarChart from "@/components/Graphs/StackedBarChart";
import styles from "./Budgeting.module.css";
import useFinancialData from "../hooks/useFinancialData";

export default function Budgeting() {
    const { cashFlowData } = useFinancialData();
    return (
        <div className={styles["page"]}>
            <StackedBarChart
                chartData={{
                    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
                    datasets: [
                        {
                            label: "income",
                            data: [5000, 5000, 5000, 5000],
                            backgroundColor: "#DEF2F2",
                            borderColor: "#4BC0C0",
                        },
                        {
                            label: "expenses",
                            backgroundColor: "#FFE1E6",
                            borderColor: "#FF6484",
                            data: [3000, 2000, 4000, 6000].map(
                                (num) => -Math.abs(num),
                            ),
                        },
                    ],
                }}
                titleText=""
            />
        </div>
    );
}
