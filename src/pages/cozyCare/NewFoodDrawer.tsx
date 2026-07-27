import { useState } from "react";
import Drawer from "../../components/ui/Drawer/Drawer";
import styles from "./NewFoodDrawer.module.css";
import sharedStyles from "./shared.module.css";
import TextInputWithSmallSelect from "../../components/ui/TextInputWithSmallSelect/TextInputWithSmallSelect";
import { apiFetch } from "../../apiFetch";

export type NewFoodDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function NewFoodDrawer({ isOpen, onClose }: NewFoodDrawerProps) {
    const [foodName, setFoodName] = useState("");
    const [quantityValue, setQuantityValue] = useState("");
    const [unitValue, setUnitValue] = useState("");
    const [caloriesValue, setCaloriesValue] = useState("");
    const [proteinValue, setProteinValue] = useState("");
    const [sugarValue, setSugarValue] = useState("");
    const [carbsValue, setCarbsValue] = useState("");
    const [sodiumValue, setSodiumValue] = useState("");
    const [iAteThisToday, setIAteThisToday] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        const isNegativeValueError = [
            quantityValue,
            caloriesValue,
            proteinValue,
            sugarValue,
            carbsValue,
            sodiumValue,
        ].some((value) => value !== "" && Number(value) < 0);

        if (isNegativeValueError) {
            setError("Invalid data - received negative number");
            return;
        }

        if (!foodName.trim() || !quantityValue) {
            setError("Please fill out name, quantity, and unit.");
            return;
        }

        setIsLoading(true);

        try {
            const response = await apiFetch("/food-entry", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: foodName.trim(),
                    quantity: Number(quantityValue),
                    unitOfMeasurement: unitValue || "unit",
                    calories: Number(caloriesValue) || 0,
                    protein: Number(proteinValue) || 0,
                    sugar: Number(sugarValue) || 0,
                    carbs: Number(carbsValue) || 0,
                    sodium: Number(sodiumValue) || 0,
                    iAteThisToday,
                }),
            });

            const result = await response.json();
            console.log("result:", result);

            if (!response.ok) {
                setError(result.message || "Invalid request");
                setIsLoading(false);
                return;
            }

            setIsLoading(false);
            handleClose();
        } catch (err) {
            console.error(err);
            setIsLoading(false);
            setError("Network error. Please try again.");
        }
    }

    function handleClose() {
        setFoodName("");
        setQuantityValue("");
        setUnitValue("");
        setCaloriesValue("");
        setProteinValue("");
        setSugarValue("");
        setCarbsValue("");
        setSodiumValue("");
        setIAteThisToday(false);
        setError("");
        return onClose();
    }

    return (
        <Drawer
            isOpen={isOpen}
            onClose={handleClose}
            drawerTitle="new food item"
            formId="food-entry-form"
            isLoading={isLoading}
        >
            <div className={styles["content"]}>
                <form
                    id="food-entry-form"
                    className={styles["food-entry-form"]}
                    onSubmit={handleSubmit}
                    noValidate
                    autoComplete="off"
                >
                    <div className={sharedStyles["input-group"]}>
                        <label htmlFor="food-name">name</label>
                        <input
                            id="food-name"
                            type="text"
                            className={sharedStyles["base-input"]}
                            value={foodName}
                            onChange={(e) => setFoodName(e.target.value)}
                        />
                    </div>

                    <div className={styles["quantity-section"]}>
                        <TextInputWithSmallSelect
                            className={sharedStyles["input-group"]}
                            inputClassName={sharedStyles["base-input"]}
                            labelText="quantity"
                            selectLabelText="unit"
                            inputId="quantity"
                            selectId="unit"
                            inputValue={quantityValue}
                            setInputValue={setQuantityValue}
                            selectValue={unitValue}
                            setSelectValue={setUnitValue}
                            selectOptions={["grams", "lbs", "cups", "units"]}
                        />
                    </div>

                    <div className={styles["checkbox-container"]}>
                        <label htmlFor="i-ate-this-today">
                            {" "}
                            i ate this today{" "}
                        </label>
                        <input
                            type="checkbox"
                            id="i-ate-this-today"
                            checked={iAteThisToday}
                            onChange={(e) => setIAteThisToday(e.target.checked)}
                        />
                    </div>

                    <p className={styles["nutrition-section-header"]}>
                        {" "}
                        nutrition information{" "}
                    </p>

                    <div className={sharedStyles["input-group"]}>
                        <label htmlFor="calories">calories</label>
                        <input
                            id="calories"
                            type="number"
                            min="0"
                            className={sharedStyles["base-input"]}
                            value={caloriesValue}
                            onChange={(e) => setCaloriesValue(e.target.value)}
                        />
                    </div>

                    <div className={sharedStyles["input-group"]}>
                        <label htmlFor="protein">protein (g)</label>
                        <input
                            id="protein"
                            type="number"
                            min="0"
                            className={sharedStyles["base-input"]}
                            value={proteinValue}
                            onChange={(e) => setProteinValue(e.target.value)}
                        />
                    </div>

                    <div className={sharedStyles["input-group"]}>
                        <label htmlFor="sugar">sugar (g)</label>
                        <input
                            id="sugar"
                            type="number"
                            min="0"
                            className={sharedStyles["base-input"]}
                            value={sugarValue}
                            onChange={(e) => setSugarValue(e.target.value)}
                        />
                    </div>

                    <div className={sharedStyles["input-group"]}>
                        <label htmlFor="carbs">carbs (g)</label>
                        <input
                            id="carbs"
                            type="number"
                            min="0"
                            className={sharedStyles["base-input"]}
                            value={carbsValue}
                            onChange={(e) => setCarbsValue(e.target.value)}
                        />
                    </div>

                    <div className={sharedStyles["input-group"]}>
                        <label htmlFor="sodium">sodium (mg)</label>
                        <input
                            id="sodium"
                            type="number"
                            min="0"
                            className={sharedStyles["base-input"]}
                            value={sodiumValue}
                            onChange={(e) => setSodiumValue(e.target.value)}
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
