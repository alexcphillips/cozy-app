import { useEffect, useState, useCallback, useMemo } from "react";
import styles from "./FoodLogSection.module.css";
import Table from "../../../components/ui/Table/Table";
import NewFoodDrawer from "../NewFoodDrawer";
import LogFoodDrawer from "../LogFoodDrawer";
import { apiFetch } from "../../../apiFetch";
import { FaRegTrashAlt } from "react-icons/fa";

type FoodLogItem = {
    id: string;
    name: string;
    measurmentText: string;
    calories: number;
    protein: number;
    sugar: number;
    carbs: number;
    sodium: number;
};

export default function FoodLogSection() {
    const [data, setData] = useState<FoodLogItem[] | null>(null);
    const [isErrorFetchingFoodLog, setIsErrorFetchingFoodLog] = useState<
        string | null
    >(null);
    const [isFoodLogLoading, setIsFoodLogLoading] = useState(false);
    const [newFoodDrawerIsOpen, setNewFoodDrawerIsOpen] = useState(false);
    const [logFoodDrawerIsOpen, setLogFoodDrawerIsOpen] = useState(false);

    const fetchFoodLogData = useCallback(async () => {
        try {
            setIsFoodLogLoading(true);
            const todayString = encodeURIComponent(
                new Date().toLocaleDateString("en-US"),
            );
            const response = await apiFetch(
                `/api/food-log?date=${todayString}`,
            );

            if (!response.ok) {
                setIsErrorFetchingFoodLog("Error fetching food log");
                return;
            }

            const result = await response.json();
            setData(result);
            setIsErrorFetchingFoodLog(null);
        } catch (err) {
            setData(null);
            setIsErrorFetchingFoodLog(
                err instanceof Error ? err.message : String(err),
            );
        } finally {
            setIsFoodLogLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFoodLogData();
    }, [fetchFoodLogData]);

    const handleNewFoodDrawerClose = () => {
        setNewFoodDrawerIsOpen(false);
        fetchFoodLogData();
    };

    const handleLogFoodDrawerClose = () => {
        setLogFoodDrawerIsOpen(false);
        fetchFoodLogData();
    };

    const totals = useMemo(() => {
        if (!data)
            return { calories: 0, protein: 0, sugar: 0, carbs: 0, sodium: 0 };
        return data.reduce(
            (acc, curr) => ({
                calories:
                    acc.calories +
                    (typeof curr.calories === "string"
                        ? parseFloat(curr.calories)
                        : Number(curr.calories) || 0),
                protein:
                    acc.protein +
                    (typeof curr.protein === "string"
                        ? parseFloat(curr.protein)
                        : Number(curr.protein) || 0),
                sugar:
                    acc.sugar +
                    (typeof curr.sugar === "string"
                        ? parseFloat(curr.sugar)
                        : Number(curr.sugar) || 0),
                carbs:
                    acc.carbs +
                    (typeof curr.carbs === "string"
                        ? parseFloat(curr.carbs)
                        : Number(curr.carbs) || 0),
                sodium:
                    acc.sodium +
                    (typeof curr.sodium === "string"
                        ? parseFloat(curr.sodium)
                        : Number(curr.sodium) || 0),
            }),
            { calories: 0, protein: 0, sugar: 0, carbs: 0, sodium: 0 },
        );
    }, [data]);

    async function handleDeleteRow(rowId: string) {
        if (!window.confirm("Are you sure you want to remove this food item?"))
            return;
        try {
            const response = await apiFetch(`/api/food-log/${rowId}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchFoodLogData();
            }
        } catch (err) {
            console.error("Failed to delete log entry:", err);
        }
    }

    return (
        <>
            <NewFoodDrawer
                onClose={handleNewFoodDrawerClose}
                isOpen={newFoodDrawerIsOpen}
            />
            <LogFoodDrawer
                onClose={handleLogFoodDrawerClose}
                isOpen={logFoodDrawerIsOpen}
            />

            <div className={styles["food-log-container"]}>
                <p className={styles["food-log-title"]}>your food log 🍓</p>

                <div className={styles["food-log"]}>
                    {isFoodLogLoading && (
                        <p className={styles["loading-text"]}>
                            Loading entries...
                        </p>
                    )}

                    {!isErrorFetchingFoodLog && !isFoodLogLoading && data && (
                        <Table<FoodLogItem>
                            data={data}
                            columns={[
                                { key: "name", label: "name" },
                                { key: "measurmentText", label: "qty" },
                                { key: "calories", label: "calories" },
                                { key: "protein", label: "protein" },
                                { key: "sugar", label: "sugar" },
                                { key: "carbs", label: "carbs" },
                                { key: "sodium", label: "sodium" },
                                {
                                    key: "id",
                                    label: "",
                                    render: (row) => (
                                        <button
                                            type="button"
                                            className={styles["delete-row-btn"]}
                                            onClick={() =>
                                                handleDeleteRow(row.id)
                                            }
                                        >
                                            <FaRegTrashAlt />
                                        </button>
                                    ),
                                },
                            ]}
                        />
                    )}

                    {isErrorFetchingFoodLog && (
                        <p className={styles["error-text"]}>
                            {isErrorFetchingFoodLog}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    className={styles["log-food-button"]}
                    onClick={() => setLogFoodDrawerIsOpen(true)}
                >
                    log food
                </button>

                <button
                    type="button"
                    className={styles["new-food-button"]}
                    onClick={() => setNewFoodDrawerIsOpen(true)}
                >
                    create food
                </button>

                {!isErrorFetchingFoodLog && !isFoodLogLoading && data && (
                    <div className={styles["summed"]}>
                        <div className={styles["total-badge"]}>
                            <span>
                                calories:{" "}
                                <strong>{totals.calories.toFixed(0)}</strong>
                            </span>
                            <span>
                                protein:{" "}
                                <strong>{totals.protein.toFixed(1)}g</strong>
                            </span>
                            <span>
                                sugar:{" "}
                                <strong>{totals.sugar.toFixed(1)}g</strong>
                            </span>
                            <span>
                                carbs:{" "}
                                <strong>{totals.carbs.toFixed(1)}g</strong>
                            </span>
                            <span>
                                sodium:{" "}
                                <strong>{totals.sodium.toFixed(0)}mg</strong>
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
