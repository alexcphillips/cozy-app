import { useState, useEffect, useMemo } from "react";
import Drawer from "@/components/Drawer/Drawer";
import Table from "@/components/Table/Table";
import type { Column } from "@/components/Table/Table";
import styles from "./LogFoodDrawer.module.css";
import sharedStyles from "./drawers.shared.module.css";
import type { FoodItem } from "@cozy/shared";
import { toErrorMessage } from "@/lib/api";
import { dietApi } from "../../api/diet.api";
import { GrRadial, GrRadialSelected } from "react-icons/gr";

export type LogFoodDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function LogFoodDrawer({ isOpen, onClose }: LogFoodDrawerProps) {
    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFoodId, setSelectedFoodId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) return;

        async function loadFoodInventory() {
            setIsLoadingItems(true);
            setError("");
            try {
                setFoodItems(await dietApi.listFoodItems());
            } catch (err) {
                setError(toErrorMessage(err));
            } finally {
                setIsLoadingItems(false);
            }
        }

        loadFoodInventory();
    }, [isOpen]);

    const filteredFoodItems = useMemo(() => {
        return foodItems.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [foodItems, searchQuery]);

    const selectedFood = foodItems.find((item) => item.id === selectedFoodId);

    const columns: Column<FoodItem>[] = useMemo(
        () => [
            {
                key: "id",
                label: "Selection",
                render: (row) => (
                    <button
                        type="button"
                        className={`${styles["select-row-btn"]} ${selectedFoodId === row.id ? styles["row-selected"] : ""}`}
                        onClick={() => setSelectedFoodId(row.id)}
                    >
                        {selectedFoodId === row.id ? (
                            <GrRadialSelected />
                        ) : (
                            <GrRadial />
                        )}
                    </button>
                ),
            },
            {
                key: "name",
                label: "Food Name",
                sortable: true,
                render: (row) => (
                    <span
                        className={
                            selectedFoodId === row.id
                                ? styles["highlight-text"]
                                : ""
                        }
                    >
                        {row.name}
                    </span>
                ),
            },
            {
                key: "unit_of_measurement",
                label: "Unit",
                sortable: true,
            },
        ],
        [selectedFoodId],
    );

    async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        if (!selectedFoodId) {
            setError("Please select a food item.");
            return;
        }

        if (!quantity || Number(quantity) <= 0) {
            setError("Please enter a valid quantity greater than 0.");
            return;
        }

        setIsSubmitting(true);

        try {
            await dietApi.createFoodLog({
                foodItemId: selectedFoodId,
                quantity: Number(quantity),
            });

            handleClose();
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleClose() {
        setSearchQuery("");
        setSelectedFoodId("");
        setQuantity("");
        setError("");
        return onClose();
    }

    return (
        <Drawer
            isOpen={isOpen}
            onClose={handleClose}
            drawerTitle="log a food item"
            formId="log-food-form"
            isLoading={isSubmitting}
        >
            <div className={styles["content"]}>
                <form
                    id="log-food-form"
                    className={styles["log-food-form"]}
                    onSubmit={handleSubmit}
                    noValidate
                    autoComplete="off"
                >
                    <div className={sharedStyles["input-group"]}>
                        <label htmlFor="food-search">search food</label>
                        <input
                            id="food-search"
                            type="text"
                            className={sharedStyles["base-input"]}
                            placeholder="Type food name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className={styles["table-wrapper"]}>
                        {isLoadingItems ? (
                            <p className={styles["loading-text"]}>
                                Loading available options...
                            </p>
                        ) : filteredFoodItems.length === 0 ? (
                            <p className={styles["no-results"]}>
                                No foods found matching your search.
                            </p>
                        ) : (
                            <Table
                                data={filteredFoodItems as unknown as any[]}
                                columns={columns as unknown as any[]}
                            />
                        )}
                    </div>

                    <div className={sharedStyles["input-group"]}>
                        <label htmlFor="log-quantity">
                            quantity{" "}
                            {selectedFood &&
                                `(${selectedFood.unit_of_measurement})`}
                        </label>
                        <input
                            id="log-quantity"
                            type="number"
                            min="0"
                            step="any"
                            className={sharedStyles["base-input"]}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            disabled={!selectedFoodId}
                            placeholder={
                                selectedFoodId
                                    ? "How much?"
                                    : "Select food from the table first"
                            }
                        />
                    </div>

                    {error && (
                        <p className={sharedStyles["error-message"]}>{error}</p>
                    )}
                </form>
            </div>
        </Drawer>
    );
}
