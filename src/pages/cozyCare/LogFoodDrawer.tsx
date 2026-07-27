import { useState, useEffect } from "react";
import Drawer from "../../components/ui/Drawer/Drawer";
import styles from "./LogFoodDrawer.module.css";
import sharedStyles from "./shared.module.css";
import { apiFetch } from "../../apiFetch";

export type LogFoodDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
};

type FoodInventoryItem = {
    id: string;
    name: string;
    unit_of_measurement: string;
};

export default function LogFoodDrawer({ isOpen, onClose }: LogFoodDrawerProps) {
    const [foodItems, setFoodItems] = useState<FoodInventoryItem[]>([]);
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
                const response = await apiFetch("/food-items");
                if (!response.ok) {
                    setError("Failed to load food list.");
                    return;
                }
                const data = await response.json();
                setFoodItems(data);
            } catch (err) {
                setError("Network error loading food items.");
            } finally {
                setIsLoadingItems(false);
            }
        }

        loadFoodInventory();
    }, [isOpen]);

    const selectedFood = foodItems.find((item) => item.id === selectedFoodId);

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
            const response = await apiFetch("/food-log", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    foodItemId: selectedFoodId,
                    quantity: Number(quantity),
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                setError(result.message || "Failed to log food.");
                setIsSubmitting(false);
                return;
            }

            setIsSubmitting(false);
            handleClose();
        } catch (err) {
            setIsSubmitting(false);
            setError("Network error. Please try again.");
        }
    }

    function handleClose() {
        setSelectedFoodId("");
        setQuantity("");
        setError("");
        return onClose();
    }

    return (
        <Drawer
            isOpen={isOpen}
            onClose={handleClose}
            drawerTitle="log your foods"
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
                        <label htmlFor="food-select">select food</label>
                        {isLoadingItems ? (
                            <p className={styles["loading-text"]}>
                                Loading available options...
                            </p>
                        ) : (
                            <select
                                id="food-select"
                                className={sharedStyles["base-input"]}
                                value={selectedFoodId}
                                onChange={(e) =>
                                    setSelectedFoodId(e.target.value)
                                }
                            >
                                <option value="" disabled hidden>
                                    choose from foods
                                </option>
                                {foodItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
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
                                    : "Select food first"
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
