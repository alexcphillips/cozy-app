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

export async function findBudget(_userId: number): Promise<Budget | null> {
    notImplemented("findBudget");
}

export async function insertBudget(
    _userId: number,
    _input: CreateBudgetRequest,
): Promise<Budget> {
    notImplemented("insertBudget");
}

export async function updateBudget(
    _userId: number,
    _edit: BudgetEdit,
): Promise<Budget> {
    notImplemented("updateBudget");
}

/* ---------------------------------------------------------- transactions -- */

export async function findTransactions(
    _userId: number,
): Promise<Transaction[]> {
    notImplemented("findTransactions");
}

export async function insertTransactions(
    _userId: number,
    _items: CreateTransactionRequest[],
): Promise<Transaction[]> {
    notImplemented("insertTransactions");
}

export async function updateTransactions(
    _userId: number,
    _edits: TransactionEdit[],
): Promise<Transaction[]> {
    notImplemented("updateTransactions");
}

/** @returns the deleted row, or `null` if it did not exist for this user. */
export async function deleteTransaction(
    _transactionId: number,
    _userId: number,
): Promise<Transaction | null> {
    notImplemented("deleteTransaction");
}

/* ------------------------------------------------------------ milestones -- */

export async function findMilestones(_userId: number): Promise<Milestone[]> {
    notImplemented("findMilestones");
}

export async function insertMilestone(
    _userId: number,
    _input: CreateMilestoneRequest,
): Promise<Milestone> {
    notImplemented("insertMilestone");
}

export async function updateMilestones(
    _userId: number,
    _edits: MilestoneEdit[],
): Promise<Milestone[]> {
    notImplemented("updateMilestones");
}

/** @returns the deleted row, or `null` if it did not exist for this user. */
export async function deleteMilestone(
    _milestoneId: number,
    _userId: number,
): Promise<Milestone | null> {
    notImplemented("deleteMilestone");
}

/* ----------------------------------------------------------------- debts -- */

export async function findDebts(_userId: number): Promise<Debt[]> {
    notImplemented("findDebts");
}

export async function insertDebt(
    _userId: number,
    _input: CreateDebtRequest,
): Promise<Debt> {
    notImplemented("insertDebt");
}

export async function updateDebts(
    _userId: number,
    _edits: DebtEdit[],
): Promise<Debt[]> {
    notImplemented("updateDebts");
}

/** @returns the deleted row, or `null` if it did not exist for this user. */
export async function deleteDebt(
    _debtId: number,
    _userId: number,
): Promise<Debt | null> {
    notImplemented("deleteDebt");
}

/* -------------------------------------------------------------- cash flow -- */

/** One row per month: income transactions summed against expense transactions. */
export async function findCashFlow(_userId: number): Promise<CashFlow[]> {
    notImplemented("findCashFlow");
}
