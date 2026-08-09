import sharedStyles from "./drawers.shared.module.css";
import FormField from "@/components/FormField/FormField";
import type { FoodItem } from "@cozy/shared";

type LogFoodDrawerAdjustStepContentProps = {
    selectedFoodItems: FoodItem[];
    quantities: Record<string, string>;
    onQuantitiesChange: (quantities: Record<string, string>) => void;
    error: string;
};

export default function LogFoodDrawerAdjustStepContent({
    selectedFoodItems,
    quantities,
    onQuantitiesChange,
    error,
}: LogFoodDrawerAdjustStepContentProps) {
    return (
        <div>
            <p
                className={`${sharedStyles["error-message"]} ${error ? sharedStyles["error-message-visible"] : ""}`}
            >
                {error}
            </p>

            {selectedFoodItems.map((foodItem) => (
                <FormField
                    key={foodItem.id}
                    id={`log-quantity-${foodItem.id}`}
                    label={`${foodItem.name} quantity`}
                    suffix={foodItem.unit_of_measurement}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="how much?"
                    value={quantities[foodItem.id] ?? ""}
                    onChange={(value) =>
                        onQuantitiesChange({
                            ...quantities,
                            [foodItem.id]: value,
                        })
                    }
                />
            ))}
        </div>
    );
}
