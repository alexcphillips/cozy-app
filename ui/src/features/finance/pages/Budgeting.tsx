import StackedBarChart from "@/components/Graphs/StackedBarChart";
import styles from "./Budgeting.module.css";
import useFinancialData from "../hooks/useFinancialData";
import Drawer from "@/components/Drawer/Drawer";

export default function Budgeting() {
    const { cashFlowData } = useFinancialData();

    // monthly
    const incomeSources = [
        {
            type: "work",
            value: 5760,
        },
        {
            type: "rent",
            value: 2500,
        },
    ];

    const expenses = [
        {
            type: "mortgage",
            value: 3750,
        },
    ];

    const monthlyIncome = incomeSources.reduce((prev, curr) => {
        return (prev += curr.value);
    }, 0);

    return (
        <div className={styles["page"]}>
            <StackedBarChart
                chartData={{
                    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
                    datasets: [
                        {
                            label: "income",
                            data: [monthlyIncome],
                            backgroundColor: "#DEF2F2",
                            borderColor: "#4BC0C0",
                        },
                        {
                            label: "expenses",
                            backgroundColor: "#FFE1E6",
                            borderColor: "#FF6484",
                            data: expenses.map(
                                (expense) => -Math.abs(expense.value),
                            ),
                        },
                    ],
                }}
                titleText=""
            />

            <CreateBudgetDrawer />
        </div>
    );
}
