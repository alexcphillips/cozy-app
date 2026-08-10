import { useEffect, useState } from "react";
import type { CashFlow } from "@cozy/shared";
import { financialApi } from "../api/finance.api";
import { toErrorMessage } from "@/lib/api";
import { useBudgetData } from "./useBudgetData";
import { useTransactionData } from "./useTransactionData";
import { useMilestoneData } from "./useMilestoneData";
import { useDebtData } from "./useDebtData";

export default function useFinancialData() {
    const [requestError, setRequestError] = useState("");
    const [cashFlowData, setCashFlowData] = useState<CashFlow[]>([]);
    const [monthlyExpenseGoal, setMonthlyExpenseGoal] = useState<number | null>(
        null,
    );

    const budgetData = useBudgetData();
    const transactionData = useTransactionData();
    const milestoneData = useMilestoneData();
    const debtData = useDebtData();

    useEffect(() => {
        async function loadCashFlow() {
            try {
                setCashFlowData(await financialApi.getCashFlow());
            } catch (err) {
                setRequestError(toErrorMessage(err));
            }
        }
        loadCashFlow();
    }, []);

    /*
      Notes:
      target savings is set in the user-made budget
      Thinking the budget should be the single source of truth for income, recurring charges (subscriptions, bills), bonuses, savings and investment targets, maybe milestones? or maybe they live seperately from budget.

      to be decided: Budget sets a savings goal or a spending limit? In cases with quarterly bonuses, the savings goal would stay the same allowing greater spending, whereas a spending goal would provide greater saving.
      
      planning for Budgeting.tsx page will display:
      cash flow tab (name tbd):
      - a monthly cash flow chart with savings goal
      - show how your milestones get closer or further if you save less or extra, example Cruise Jan 2 2027 -> Jan 22 2027
      - list of the month's transactions, button for drawer to upload transactions via file or manual, recurring future monthly expenses
      budget tab:
      - user budget, where they can view and edit it
      projection tab (name tbd):
      - user can set milestones, such as saving up for a vacation
      - displays how much you'll need to save to reach the goal by the target date/what date you'll reach the goal if you adjust the target savings
      - displays projected investment growth using different stock averages
      - display projected debts, payoff time, and calculate which debts are highest priority to pay for long term money
      

      somewhere - housing payment and escrow calculation

      To be decided: what does the api actually need to expose?
      A: Expose crud groups for budget and transactions, build cash flow from budget income minus transactions per month
      B: Expose crud groups for budget, transactions, and an endpoint for cash flow

      Need to review this hook and what it needs to provide, following pattern outlined in architecture.md and review pattern in the useWeightData hook

    */

    return {
        requestError,
        cashFlowData,
        monthlyExpenseGoal,
        setMonthlyExpenseGoal,
        ...budgetData,
        ...transactionData,
        ...milestoneData,
        ...debtData,
    };
}
