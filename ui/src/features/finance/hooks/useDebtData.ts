import { useEffect, useState } from "react";
import type { CreateDebtRequest, Debt, DebtEdit } from "@cozy/shared";

export function useDebtData() {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [debtError, setDebtError] = useState("");

    useEffect(() => {
        getDebts();
    }, []);

    async function getDebts() {}
    async function createDebt(input: CreateDebtRequest) {}
    async function editDebts(edits: DebtEdit[]) {}
    async function deleteDebt(debtId: number) {}

    return { debts, debtError, getDebts, createDebt, editDebts, deleteDebt };
}
