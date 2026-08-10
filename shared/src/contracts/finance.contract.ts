/** A user's single, evolving budget — edited in place, never versioned. */
export type Budget = {
    id: number;
    monthlyIncome: number;
    savingsTarget: number;
};

export type CreateBudgetRequest = {
    monthlyIncome: number;
    savingsTarget: number;
};

/** No `id` - there is exactly one budget per user, found via the auth token. */
export type BudgetEdit = Partial<CreateBudgetRequest>;

export type TransactionType = "income" | "expense";

export type Transaction = {
    id: number;
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    date: string;
};

export type CreateTransactionRequest = {
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    date: string;
};

export type TransactionEdit = { id: number } & Partial<CreateTransactionRequest>;

export type Milestone = {
    id: number;
    name: string;
    targetAmount: number;
    targetDate: string;
    currentSaved: number;
};

export type CreateMilestoneRequest = {
    name: string;
    targetAmount: number;
    targetDate: string;
};

export type MilestoneEdit = { id: number } & Partial<
    CreateMilestoneRequest & { currentSaved: number }
>;

export type Debt = {
    id: number;
    name: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
};

export type CreateDebtRequest = {
    name: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
};

export type DebtEdit = { id: number } & Partial<CreateDebtRequest>;

/** One month's totals — the input to the money-in/money-out stacked bar chart. */
export type CashFlow = {
    month: string;
    moneyIn: number;
    moneyOut: number;
};
