import { useState, useEffect, useCallback } from "react";
import Drawer from "@/components/Drawer/Drawer";
import { toErrorMessage } from "@/lib/api";
import { dietApi } from "../../api/diet.api";
import { LogFoodDrawerSelectStepContent } from "./LogFoodDrawerSelectStepContent";
import { useStepper } from "@/components/Stepper/useStepper";
import LogFoodDrawerAdjustStepContent from "./LogFoodDrawerAdjustStepContent";
import type { FoodItem } from "@cozy/shared";
import StepperFooter from "@/components/Stepper/StepperFooter";
import Stepper from "@/components/Stepper/Stepper";
import DefaultStepperHeader from "@/components/Stepper/DefaultStepperHeader";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";

const TITLE = "log a food";
const STEPS = ["select foods", "adjust foods"];

export type LogFoodDrawerProps = {
    onClose: () => void;
};

export default function LogFoodDrawer({ onClose }: LogFoodDrawerProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
    const [selectedFoodItems, setSelectedFoodItems] = useState<FoodItem[]>([]);
    const [quantities, setQuantities] = useState<Record<string, string>>({});

    const { stepIndex, next, previous, isFirst, isLast } = useStepper(
        STEPS.length,
    );

    useEffect(() => {
        let ignore = false;

        async function loadFoodInventory() {
            setIsLoadingItems(true);
            setError("");
            try {
                const items = await dietApi.listFoodItems();
                if (!ignore) setFoodItems(items);
            } catch (err) {
                if (!ignore) setError(toErrorMessage(err));
            } finally {
                if (!ignore) setIsLoadingItems(false);
            }
        }

        loadFoodInventory();

        return () => {
            ignore = true;
        };
    }, []);

    async function handleSubmit() {
        setError("");

        const invalidItem = selectedFoodItems.find((item) => {
            const parsedQuantity = Number(quantities[item.id]);
            return (
                !quantities[item.id] ||
                !Number.isFinite(parsedQuantity) ||
                parsedQuantity <= 0
            );
        });

        if (invalidItem) {
            setError(`Please enter a valid quantity for ${invalidItem.name}.`);
            return;
        }

        setIsSubmitting(true);

        try {
            await dietApi.createFoodLog({
                items: selectedFoodItems.map((item) => ({
                    foodItemId: item.id,
                    quantity: Number(quantities[item.id]),
                })),
            });

            onClose();
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleSelectionChange = useCallback(
        (nextSelection: FoodItem[]) => {
            setError("");
            setSelectedFoodItems(nextSelection);

            const nextIds = new Set(nextSelection.map((item) => item.id));
            setQuantities((prev) =>
                Object.fromEntries(
                    Object.entries(prev).filter(([id]) => nextIds.has(id)),
                ),
            );
        },
        [],
    );

    const handleQuantitiesChange = useCallback(
        (nextQuantities: Record<string, string>) => {
            setError("");
            setQuantities(nextQuantities);
        },
        [],
    );

    function handleNextStep() {
        if (!selectedFoodItems.length) {
            setError("select items first");
            return;
        }
        next();
    }

    function handlePrevious() {
        setError("");
        previous();
    }

    return (
        <Drawer
            title={TITLE}
            onClose={onClose}
            header={
                <DefaultStepperHeader
                    title={TITLE}
                    stepper={
                        <Stepper steps={STEPS} currentStep={stepIndex} />
                    }
                />
            }
            footer={
                <StepperFooter
                    onCancel={onClose}
                    onPrevious={handlePrevious}
                    onNext={isLast ? handleSubmit : handleNextStep}
                    previousDisabled={isFirst}
                    nextLabel={isLast ? "submit" : "next"}
                    isLoading={isSubmitting}
                />
            }
        >
            <ErrorMessage message={error} />

            {stepIndex === 0 && (
                <LogFoodDrawerSelectStepContent
                    foodItems={foodItems}
                    selectedFoodItems={selectedFoodItems}
                    onSelectionChange={handleSelectionChange}
                    isLoadingItems={isLoadingItems}
                />
            )}

            {stepIndex === 1 && (
                <LogFoodDrawerAdjustStepContent
                    selectedFoodItems={selectedFoodItems}
                    quantities={quantities}
                    onQuantitiesChange={handleQuantitiesChange}
                />
            )}
        </Drawer>
    );
}
