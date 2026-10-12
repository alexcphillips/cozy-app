import styles from "./LogFoodDrawerSelectStepContent.module.css";
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
};

export function LogFoodDrawerSelectStepContent({
    foodItems,
    selectedFoodItems,
    onSelectionChange,
    isLoadingItems,
}: LogFoodDrawerSelectStepContentProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredFoodItems = useMemo(() => {
        const query = normalizeSearchText(searchQuery);

        return foodItems.filter((item) =>
            normalizeSearchText(item.name).includes(query),
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
                label: "selection",
                render: (row) => {
                    const isSelected = selectedFoodItems.some(
                        (item) => item.id === row.id,
                    );
                    return (
                        <button
                            type="button"
                            className={`${styles["select-row-btn"]} ${isSelected ? styles["row-selected"] : ""}`}
                            onClick={() => handleSelection(row)}
                            aria-pressed={isSelected}
                            aria-label={`select ${row.name}`}
                        >
                            {isSelected ? <GrRadialSelected /> : <GrRadial />}
                        </button>
                    );
                },
            },
            {
                key: "name",
                label: "name",
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
                label: "unit",
                sortable: true,
            },
        ];
    }, [selectedFoodItems, onSelectionChange]);

    return (
        <div className={styles["content"]}>
            {/* Not a <form>: nothing here submits, and a lone text input inside
                a form submits on Enter, which would reload the page. */}
            <div className={styles["log-food-form"]}>
                <FormField
                    id="food-search"
                    label="search food"
                    placeholder="Type food name..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                    autoComplete="off"
                />

                {isLoadingItems ? (
                    <p className={styles["loading-text"]}>loading foods...</p>
                ) : (
                    <div className={styles["table-wrapper"]}>
                        <Table data={filteredFoodItems} columns={columns} />
                    </div>
                )}
            </div>
        </div>
    );
}
