import styles from "./LogFoodDrawerSelectStepContent.module.css";
import sharedStyles from "./drawers.shared.module.css";
import type { Column } from "@/components/Table/Table";
import Table from "@/components/Table/Table";
import FormField from "@/components/FormField/FormField";
import type { FoodItem } from "@cozy/shared";
import { useMemo, useState } from "react";
import { GrRadial, GrRadialSelected } from "react-icons/gr";
import { normalizeSearchText } from "@cozy/shared";

type LogFoodDrawerSelectStepContentProps = {
    foodItems: FoodItem[];
    selectedFoodItems: FoodItem[];
    onSelectionChange: (selectedFoodItems: FoodItem[]) => void;
    isLoadingItems: boolean;
    error: string;
};

export function LogFoodDrawerSelectStepContent({
    foodItems,
    selectedFoodItems,
    onSelectionChange,
    isLoadingItems,
    error,
}: LogFoodDrawerSelectStepContentProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredFoodItems = useMemo(() => {
        const query = normalizeSearchText(searchQuery);

        return foodItems.filter((item) =>
            item.name.toLowerCase().includes(query),
        );
    }, [foodItems, searchQuery]);

    const columns: Column<FoodItem>[] = useMemo(() => {
        function handleSelection(foodItem: FoodItem) {
            const nextSelection = selectedFoodItems.some(
                (selection) => selection.id === foodItem.id,
            )
                ? selectedFoodItems.filter(
                      (selection) => selection.id !== foodItem.id,
                  )
                : [...selectedFoodItems, foodItem];

            onSelectionChange(nextSelection);
        }
        return [
            {
                key: "id",
                label: "Selection",
                render: (row) => {
                    const isSelected = selectedFoodItems.some(
                        (item) => item.id === row.id,
                    );
                    return (
                        <button
                            type="button"
                            className={`${styles["select-row-btn"]} ${isSelected ? styles["row-selected"] : ""}`}
                            onClick={() => handleSelection(row)}
                        >
                            {isSelected ? <GrRadialSelected /> : <GrRadial />}
                        </button>
                    );
                },
            },
            {
                key: "name",
                label: "Food Name",
                sortable: true,
                render: (row) => {
                    const isSelected = selectedFoodItems.some(
                        (item) => item.id === row.id,
                    );

                    return (
                        <span
                            className={
                                isSelected ? styles["highlight-text"] : ""
                            }
                        >
                            {row.name}
                        </span>
                    );
                },
            },
            {
                key: "unit_of_measurement",
                label: "Unit",
                sortable: true,
            },
        ];
    }, [selectedFoodItems, onSelectionChange]);

    return (
        <div className={styles["content"]}>
            <form
                id="log-food-form"
                className={styles["log-food-form"]}
                noValidate
                autoComplete="off"
            >
                <FormField
                    id="food-search"
                    label="search food"
                    placeholder="Type food name..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                />

                <p
                    className={`${sharedStyles["error-message"]} ${error ? sharedStyles["error-message-visible"] : ""}`}
                >
                    {error}
                </p>

                {isLoadingItems ? (
                    <p className={styles["loading-text"]}>loading foods...</p>
                ) : (
                    <div className={styles["table-wrapper"]}>
                        <Table data={filteredFoodItems} columns={columns} />
                    </div>
                )}
            </form>
        </div>
    );
}
