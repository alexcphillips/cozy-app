import { useEffect, useState, useCallback, useMemo } from "react";
import styles from "./FoodLogSection.module.css";
import Table from "../../../../components/Table/Table";
import NewFoodDrawer from "../drawers/NewFoodDrawer";
import LogFoodDrawer from "../drawers/LogFoodDrawer";
import type { FoodLogEntry } from "@cozy/shared";
import { toErrorMessage } from "../../../../lib/api";
import { dietApi } from "../../api/diet.api";
import { FaRegTrashAlt } from "react-icons/fa";

export default function FoodLogSection() {
    const [data, setData] = useState<FoodLogEntry[] | null>(null);
    const [isErrorFetchingFoodLog, setIsErrorFetchingFoodLog] = useState<
        string | null
    >(null);
    const [isFoodLogLoading, setIsFoodLogLoading] = useState(false);
    const [newFoodDrawerIsOpen, setNewFoodDrawerIsOpen] = useState(false);
    const [logFoodDrawerIsOpen, setLogFoodDrawerIsOpen] = useState(false);

    const fetchFoodLogData = useCallback(async () => {
        try {
            setIsFoodLogLoading(true);
            const today = new Date().toLocaleDateString("en-US");

            setData(await dietApi.listFoodLog(today));
            setIsErrorFetchingFoodLog(null);
        } catch (err) {
            setData(null);
            setIsErrorFetchingFoodLog(toErrorMessage(err));
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
        // Nutrition arrives as numbers: db/pool.ts parses Postgres NUMERIC once,
        // server-side, so no per-field string coercion is needed here.
        return data.reduce(
            (totals, entry) => ({
                calories: totals.calories + entry.calories,
                protein: totals.protein + entry.protein,
                sugar: totals.sugar + entry.sugar,
                carbs: totals.carbs + entry.carbs,
                sodium: totals.sodium + entry.sodium,
            }),
            { calories: 0, protein: 0, sugar: 0, carbs: 0, sodium: 0 },
        );
    }, [data]);

    async function handleDeleteRow(rowId: string) {
        if (!window.confirm("Are you sure you want to remove this food item?"))
            return;
        try {
            await dietApi.deleteFoodLogItem(rowId);
            fetchFoodLogData();
        } catch (err) {
            setIsErrorFetchingFoodLog(toErrorMessage(err));
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

                <div className={styles["action-buttons"]}>
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
                </div>
                <div className={styles["food-log"]}>
                    {isFoodLogLoading && (
                        <p className={styles["loading-text"]}>
                            Loading entries...
                        </p>
                    )}

                    {!isErrorFetchingFoodLog && !isFoodLogLoading && data && (
                        <Table<FoodLogEntry>
                            data={data}
                            columns={[
                                { key: "name", label: "name" },
                                { key: "measurementText", label: "qty" },
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
