import { Router } from "express";
import { API_PATHS } from "@cozy/shared";
import { asyncHandler } from "../../http/asyncHandler";
import { auth } from "../../middleware/auth";
import * as financeController from "./finance.controller";

/**
 * Budget, transactions, milestones, debts, and the derived cash-flow view.
 * Every row here is user-scoped, so every route carries `auth` explicitly.
 */
export const financeRouter: Router = Router();

financeRouter.get(
    API_PATHS.finance.budget,
    auth,
    asyncHandler(financeController.getBudget),
);
financeRouter.post(
    API_PATHS.finance.budget,
    auth,
    asyncHandler(financeController.createBudget),
);
financeRouter.patch(
    API_PATHS.finance.budget,
    auth,
    asyncHandler(financeController.editBudget),
);

financeRouter.get(
    API_PATHS.finance.transactions,
    auth,
    asyncHandler(financeController.getTransactions),
);
financeRouter.post(
    API_PATHS.finance.transactions,
    auth,
    asyncHandler(financeController.uploadTransactions),
);
financeRouter.patch(
    API_PATHS.finance.transactions,
    auth,
    asyncHandler(financeController.editTransactions),
);
financeRouter.delete(
    API_PATHS.finance.transactionItem,
    auth,
    asyncHandler(financeController.deleteTransaction),
);

financeRouter.get(
    API_PATHS.finance.milestones,
    auth,
    asyncHandler(financeController.getMilestones),
);
financeRouter.post(
    API_PATHS.finance.milestones,
    auth,
    asyncHandler(financeController.createMilestone),
);
financeRouter.patch(
    API_PATHS.finance.milestones,
    auth,
    asyncHandler(financeController.editMilestones),
);
financeRouter.delete(
    API_PATHS.finance.milestoneItem,
    auth,
    asyncHandler(financeController.deleteMilestone),
);

financeRouter.get(
    API_PATHS.finance.debts,
    auth,
    asyncHandler(financeController.getDebts),
);
financeRouter.post(
    API_PATHS.finance.debts,
    auth,
    asyncHandler(financeController.createDebt),
);
financeRouter.patch(
    API_PATHS.finance.debts,
    auth,
    asyncHandler(financeController.editDebts),
);
financeRouter.delete(
    API_PATHS.finance.debtItem,
    auth,
    asyncHandler(financeController.deleteDebt),
);

financeRouter.get(
    API_PATHS.finance.cashFlow,
    auth,
    asyncHandler(financeController.getCashFlow),
);
