import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    type ChartOptions,
    type ChartData,
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
);

const SURFACE_GAP = "#fffdfd";

interface StackedBarChartProps {
    chartData: ChartData<"bar">;
    titleText?: string;
    maxValue?: number;
}

export default function StackedBarChart({
    chartData,
    titleText = "My Stacked Bar Chart",
    maxValue,
}: StackedBarChartProps) {
    const options: ChartOptions<"bar"> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        datasets: {
            bar: {
                maxBarThickness: 24,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: SURFACE_GAP,
            },
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
            },
            y: {
                stacked: true,
                beginAtZero: true,
                suggestedMax: maxValue,
            },
        },
        plugins: {
            legend: {
                display: (chartData.datasets?.length ?? 0) > 1,
                position: "top",
            },
            title: {
                display: true,
                text: titleText,
            },
        },
    };

    return <Bar options={options} data={chartData} />;
}
