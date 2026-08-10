import { useEffect, useState } from "react";
import type { Budget, BudgetEdit, CreateBudgetRequest } from "@cozy/shared";

export function useBudgetData() {
    const [budget, setBudget] = useState<Budget | null>(null);
    const [budgetError, setBudgetError] = useState("");

    useEffect(() => {
        getBudget();
    }, []);

    async function getBudget() {}
    async function createBudget(input: CreateBudgetRequest) {}
    async function editBudget(edit: BudgetEdit) {}

    return { budget, budgetError, getBudget, createBudget, editBudget };
}
