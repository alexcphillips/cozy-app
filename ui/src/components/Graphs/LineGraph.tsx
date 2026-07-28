import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type ChartOptions,
    type ChartData,
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

interface LineGraphProps {
    chartData: ChartData<"line">;
    titleText?: string;
    maxValue?: number;
    minValue?: number;
}

export default function LineGraph({
    chartData,
    titleText = "My Line Chart",
    maxValue,
    minValue,
}: LineGraphProps) {
    const options: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                suggestedMax: maxValue ? maxValue + 10 : 0,
                suggestedMin: minValue ? minValue - 5 : 0,
            },
        },
        plugins: {
            legend: {
                // position: "top" as const,
                display: false,
            },
            title: {
                display: true,
                text: titleText,
            },
        },
    };

    return <Line options={options} data={chartData} />;
}
