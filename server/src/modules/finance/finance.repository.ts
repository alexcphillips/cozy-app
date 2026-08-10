import type {
    Budget,
    BudgetEdit,
    CashFlow,
    CreateBudgetRequest,
    CreateDebtRequest,
    CreateMilestoneRequest,
    CreateTransactionRequest,
    Debt,
    DebtEdit,
    Milestone,
    MilestoneEdit,
    Transaction,
    TransactionEdit,
} from "@cozy/shared";

/**
 * TODO: wire these up to Postgres via `query()` + `finance.sql.ts`, following
 * the shape in `modules/diet/diet.repository.ts` - rows mapped to
 * `@cozy/shared` contract types, nothing else touches `pg` for this module.
 */
function notImplemented(fn: string): never {
    throw new Error(`finance.repository.${fn} is not implemented yet`);
}

/* ---------------------------------------------------------------- budget -- */

export async function findBudget(userId: number): Promise<Budget | null> {
    notImplemented("findBudget");
}

export async function insertBudget(
    userId: number,
    input: CreateBudgetRequest,
): Promise<Budget> {
    notImplemented("insertBudget");
}

export async function updateBudget(
    userId: number,
    edit: BudgetEdit,
): Promise<Budget> {
    notImplemented("updateBudget");
}

/* ---------------------------------------------------------- transactions -- */

export async function findTransactions(
    userId: number,
): Promise<Transaction[]> {
    notImplemented("findTransactions");
}

export async function insertTransactions(
    userId: number,
    items: CreateTransactionRequest[],
): Promise<Transaction[]> {
    notImplemented("insertTransactions");
}

export async function updateTransactions(
    userId: number,
    edits: TransactionEdit[],
): Promise<Transaction[]> {
    notImplemented("updateTransactions");
}

/** @returns the deleted row, or `null` if it did not exist for this user. */
export async function deleteTransaction(
    transactionId: number,
    userId: number,
): Promise<Transaction | null> {
    notImplemented("deleteTransaction");
}

/* ------------------------------------------------------------ milestones -- */

export async function findMilestones(userId: number): Promise<Milestone[]> {
    notImplemented("findMilestones");
}

export async function insertMilestone(
    userId: number,
    input: CreateMilestoneRequest,
): Promise<Milestone> {
    notImplemented("insertMilestone");
}

export async function updateMilestones(
    userId: number,
    edits: MilestoneEdit[],
): Promise<Milestone[]> {
    notImplemented("updateMilestones");
}

/** @returns the deleted row, or `null` if it did not exist for this user. */
export async function deleteMilestone(
    milestoneId: number,
    userId: number,
): Promise<Milestone | null> {
    notImplemented("deleteMilestone");
}

/* ----------------------------------------------------------------- debts -- */

export async function findDebts(userId: number): Promise<Debt[]> {
    notImplemented("findDebts");
}

export async function insertDebt(
    userId: number,
    input: CreateDebtRequest,
): Promise<Debt> {
    notImplemented("insertDebt");
}

export async function updateDebts(
    userId: number,
    edits: DebtEdit[],
): Promise<Debt[]> {
    notImplemented("updateDebts");
}

/** @returns the deleted row, or `null` if it did not exist for this user. */
export async function deleteDebt(
    debtId: number,
    userId: number,
): Promise<Debt | null> {
    notImplemented("deleteDebt");
}

/* -------------------------------------------------------------- cash flow -- */

/** One row per month: income transactions summed against expense transactions. */
export async function findCashFlow(userId: number): Promise<CashFlow[]> {
    notImplemented("findCashFlow");
}
