import FormField from "@/components/FormField/FormField";
import type { FoodItem } from "@cozy/shared";

type LogFoodDrawerAdjustStepContentProps = {
    selectedFoodItems: FoodItem[];
    quantities: Record<string, string>;
    onQuantitiesChange: (quantities: Record<string, string>) => void;
};

export default function LogFoodDrawerAdjustStepContent({
    selectedFoodItems,
    quantities,
    onQuantitiesChange,
}: LogFoodDrawerAdjustStepContentProps) {
    return (
        <div>
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
