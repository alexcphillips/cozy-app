import { useState, useEffect } from "react";
import Drawer from "@/components/Drawer/Drawer";
import { toErrorMessage } from "@/lib/api";
import { dietApi } from "../../api/diet.api";
import { LogFoodDrawerSelectStepContent } from "./LogFoodDrawerSelectStepContent";
import { useStepper } from "../../hooks/useStepper";
import LogFoodDrawerAdjustStepContent from "./LogFoodDrawerAdjustStepContent";
import BackdropOverlay from "@/components/BackdropOverlay/BackdropOverlay";
import DefaultDismissButton from "@/components/Drawer/DefaultDismissButton";
import type { FoodItem } from "@cozy/shared";
import StepperFooter from "@/components/Stepper/StepperFooter";
import Stepper from "@/components/Stepper/Stepper";
import DefaultStepperHeader from "@/components/Stepper/DefaultStepperHeader";

export type LogFoodDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function LogFoodDrawer({ isOpen, onClose }: LogFoodDrawerProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
    const [selectedFoodItems, setSelectedFoodItems] = useState<FoodItem[]>([]);
    const [quantities, setQuantities] = useState<Record<string, string>>({});

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

    const steps = ["select foods", "adjust foods"];

    const { stepIndex, next, previous, reset, isFirst, isLast } = useStepper(
        steps.length,
    );

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

            handleClose();
        } catch (err) {
            setError(toErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleSelectionChange(nextSelection: FoodItem[]) {
        setError("");
        setSelectedFoodItems(nextSelection);

        const nextIds = new Set(nextSelection.map((item) => item.id));
        setQuantities((prev) =>
            Object.fromEntries(
                Object.entries(prev).filter(([id]) => nextIds.has(id)),
            ),
        );
    }

    function handleQuantitiesChange(nextQuantities: Record<string, string>) {
        setError("");
        setQuantities(nextQuantities);
    }

    function handleNextStep() {
        if (!selectedFoodItems.length) {
            setError("select items first");
            return false;
        }
        next();
    }

    function handlePrevious() {
        setError("");
        previous();
    }

    if (!steps[stepIndex]) return;

    function handleClose() {
        setSelectedFoodItems([]);
        setQuantities({});
        setError("");
        reset();
        onClose();
    }

    return (
        <Drawer
            isOpen={isOpen}
            header={
                <DefaultStepperHeader
                    title="log a food"
                    StepperComponent={() => (
                        <Stepper steps={steps} currentStep={stepIndex} />
                    )}
                />
            }
            footer={
                <StepperFooter
                    onCancel={handleClose}
                    onPrevious={handlePrevious}
                    onNext={isLast ? handleSubmit : handleNextStep}
                    previousDisabled={isFirst}
                    nextLabel={isLast ? "submit" : "next"}
                    isLoading={isSubmitting}
                />
            }
            backdrop={<BackdropOverlay onClose={handleClose} />}
            dismissButton={<DefaultDismissButton onClose={handleClose} />}
        >
            {stepIndex === 0 && (
                <LogFoodDrawerSelectStepContent
                    foodItems={foodItems}
                    selectedFoodItems={selectedFoodItems}
                    onSelectionChange={handleSelectionChange}
                    isLoadingItems={isLoadingItems}
                    error={error}
                />
            )}

            {stepIndex === 1 && (
                <LogFoodDrawerAdjustStepContent
                    selectedFoodItems={selectedFoodItems}
                    quantities={quantities}
                    onQuantitiesChange={handleQuantitiesChange}
                    error={error}
                />
            )}
        </Drawer>
    );
}
