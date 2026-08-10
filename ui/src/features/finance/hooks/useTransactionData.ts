import { useEffect, useState } from "react";
import type {
    CreateTransactionRequest,
    Transaction,
    TransactionEdit,
} from "@cozy/shared";

export function useTransactionData() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionError, setTransactionError] = useState("");

    useEffect(() => {
        getTransactions();
    }, []);

    async function getTransactions() {}
    async function uploadTransactions(
        transactions: CreateTransactionRequest[],
    ) {}
    async function editTransactions(edits: TransactionEdit[]) {}
    async function deleteTransaction(transactionId: number) {}

    return {
        transactions,
        transactionError,
        getTransactions,
        uploadTransactions,
        editTransactions,
        deleteTransaction,
    };
}
