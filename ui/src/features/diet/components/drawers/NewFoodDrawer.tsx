import { useState } from "react";
import Drawer from "@/components/Drawer/Drawer";
import BackdropOverlay from "@/components/BackdropOverlay/BackdropOverlay";
import DefaultDismissButton from "@/components/Drawer/DefaultDismissButton";
import { DefaultFooter } from "@/components/Drawer/DefaultFooter";
import DefaultHeaderComponent from "@/components/Drawer/DefaultHeaderComponent";
import styles from "./NewFoodDrawer.module.css";
import sharedStyles from "./drawers.shared.module.css";
import FormField from "@/components/FormField/FormField";
import TextInputWithSmallSelect from "@/components/TextInputWithSmallSelect/TextInputWithSmallSelect";
import { toErrorMessage } from "@/lib/api";
import { dietApi } from "../../api/diet.api";

export type NewFoodDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
};

type FoodFormState = {
    name: string;
    quantity: string;
    unit: string;
    calories: string;
    protein: string;
    sugar: string;
    carbs: string;
    sodium: string;
};

const EMPTY_FORM: FoodFormState = {
    name: "",
    quantity: "",
    unit: "",
    calories: "",
    protein: "",
    sugar: "",
    carbs: "",
    sodium: "",
};

export default function NewFoodDrawer({ isOpen, onClose }: NewFoodDrawerProps) {
    const [form, setForm] = useState<FoodFormState>(EMPTY_FORM);
    const [iAteThisToday, setIAteThisToday] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    function updateField<K extends keyof FoodFormState>(
        key: K,
        value: FoodFormState[K],
    ) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        const isNegativeValueError = [
            form.quantity,
            form.calories,
            form.protein,
            form.sugar,
            form.carbs,
            form.sodium,
        ].some((value) => value !== "" && Number(value) < 0);

        if (isNegativeValueError) {
            setError("Invalid data - received negative number");
            return;
        }

        if (!form.name.trim() || !form.quantity) {
            setError("please fill out name, and quantity");
            return;
        }

        setIsLoading(true);

        try {
            await dietApi.createFoodItem({
                name: form.name.trim(),
                quantity: Number(form.quantity),
                unitOfMeasurement: form.unit || "units",
                calories: Number(form.calories) || 0,
                protein: Number(form.protein) || 0,
                sugar: Number(form.sugar) || 0,
                carbs: Number(form.carbs) || 0,
                sodium: Number(form.sodium) || 0,
                iAteThisToday,
            });

            handleClose();
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }

    function handleClose() {
        setForm(EMPTY_FORM);
        setIAteThisToday(false);
        setError("");
        onClose();
    }

    return (
        <Drawer
            isOpen={isOpen}
            header={<DefaultHeaderComponent title="new food item" />}
            footer={
                <DefaultFooter
                    onClose={handleClose}
                    formId="food-entry-form"
                    isLoading={isLoading}
                />
            }
            backdrop={<BackdropOverlay onClose={handleClose} />}
            dismissButton={<DefaultDismissButton onClose={handleClose} />}
        >
            <div className={styles["content"]}>
                <form
                    id="food-entry-form"
                    className={styles["food-entry-form"]}
                    onSubmit={handleSubmit}
                    noValidate
                    autoComplete="off"
                >
                    <FormField
                        id="food-name"
                        label="name"
                        value={form.name}
                        onChange={(value) => updateField("name", value)}
                    />

                    <TextInputWithSmallSelect
                        className={sharedStyles["input-group"]}
                        inputClassName={sharedStyles["base-input"]}
                        labelText="quantity"
                        selectLabelText="unit"
                        inputId="quantity"
                        selectId="unit"
                        inputValue={form.quantity}
                        setInputValue={(value) =>
                            updateField("quantity", value)
                        }
                        selectValue={form.unit}
                        setSelectValue={(value) => updateField("unit", value)}
                        selectOptions={["grams", "lbs", "cups", "units"]}
                    />

                    <div className={styles["checkbox-container"]}>
                        <label htmlFor="i-ate-this-today">
                            i ate this today
                        </label>
                        <input
                            type="checkbox"
                            id="i-ate-this-today"
                            checked={iAteThisToday}
                            onChange={(e) => setIAteThisToday(e.target.checked)}
                        />
                    </div>

                    <p className={styles["nutrition-section-header"]}>
                        nutrition information
                    </p>

                    <FormField
                        id="calories"
                        label="calories"
                        type="number"
                        min="0"
                        value={form.calories}
                        onChange={(value) => updateField("calories", value)}
                    />

                    <FormField
                        id="protein"
                        label="protein"
                        suffix="g"
                        type="number"
                        min="0"
                        value={form.protein}
                        onChange={(value) => updateField("protein", value)}
                    />

                    <FormField
                        id="sugar"
                        label="sugar"
                        suffix="g"
                        type="number"
                        min="0"
                        value={form.sugar}
                        onChange={(value) => updateField("sugar", value)}
                    />

                    <FormField
                        id="carbs"
                        label="carbs"
                        suffix="g"
                        type="number"
                        min="0"
                        value={form.carbs}
                        onChange={(value) => updateField("carbs", value)}
                    />

                    <FormField
                        id="sodium"
                        label="sodium"
                        suffix="mg"
                        type="number"
                        min="0"
                        value={form.sodium}
                        onChange={(value) => updateField("sodium", value)}
                    />

                    <p
                        className={`${sharedStyles["error-message"]} ${error ? sharedStyles["error-message-visible"] : ""}`}
                    >
                        {error}
                    </p>
                </form>
            </div>
        </Drawer>
    );
}
