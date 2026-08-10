import type { Request, Response } from "express";
import type {
    CreateBudgetRequest,
    CreateDebtRequest,
    CreateMilestoneRequest,
    CreateTransactionRequest,
    DebtEdit,
    MilestoneEdit,
    TransactionEdit,
    TransactionType,
} from "@cozy/shared";
import { AppError } from "../../http/AppError";
import * as financeRepository from "./finance.repository";

/** Every route in this module is mounted behind `auth`, so `req.user` is set. */
function requireUserId(req: Request): number {
    return req.user!.userId;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function requireIdParam(req: Request, paramName: string): number {
    const id = Number(req.params[paramName]);

    if (!Number.isFinite(id)) {
        throw AppError.badRequest(`Invalid or missing ${paramName}`);
    }

    return id;
}

const TRANSACTION_TYPES: readonly TransactionType[] = ["income", "expense"];

/* ---------------------------------------------------------------- budget -- */

export async function getBudget(req: Request, res: Response) {
    const budget = await financeRepository.findBudget(requireUserId(req));

    if (!budget) {
        throw AppError.notFound("No budget set up yet");
    }

    res.status(200).json(budget);
}

export async function createBudget(req: Request, res: Response) {
    const body = (req.body ?? {}) as Partial<CreateBudgetRequest>;

    if (
        !isFiniteNumber(body.monthlyIncome) ||
        body.monthlyIncome < 0 ||
        !isFiniteNumber(body.savingsTarget) ||
        body.savingsTarget < 0
    ) {
        throw AppError.badRequest("Invalid monthlyIncome or savingsTarget");
    }

    res.status(201).json(
        await financeRepository.insertBudget(requireUserId(req), {
            monthlyIncome: body.monthlyIncome,
            savingsTarget: body.savingsTarget,
        }),
    );
}

export async function editBudget(req: Request, res: Response) {
    const body = (req.body ?? {}) as Partial<CreateBudgetRequest>;

    if (
        (body.monthlyIncome !== undefined &&
            (!isFiniteNumber(body.monthlyIncome) || body.monthlyIncome < 0)) ||
        (body.savingsTarget !== undefined &&
            (!isFiniteNumber(body.savingsTarget) || body.savingsTarget < 0))
    ) {
        throw AppError.badRequest("Invalid monthlyIncome or savingsTarget");
    }

    if (body.monthlyIncome === undefined && body.savingsTarget === undefined) {
        throw AppError.badRequest("No fields to update");
    }

    res.status(200).json(
        await financeRepository.updateBudget(requireUserId(req), body),
    );
}

/* ---------------------------------------------------------- transactions -- */

function parseTransactionInput(
    input: unknown,
): CreateTransactionRequest {
    const body = (input ?? {}) as Partial<CreateTransactionRequest>;

    if (
        !body.description?.trim() ||
        !isFiniteNumber(body.amount) ||
        body.amount <= 0 ||
        !body.type ||
        !TRANSACTION_TYPES.includes(body.type) ||
        !body.category?.trim() ||
        !body.date ||
        Number.isNaN(Date.parse(body.date))
    ) {
        throw AppError.badRequest("Invalid transaction");
    }

    return {
        description: body.description.trim(),
        amount: body.amount,
        type: body.type,
        category: body.category.trim(),
        date: body.date,
    };
}

export async function getTransactions(req: Request, res: Response) {
    res.status(200).json(
        await financeRepository.findTransactions(requireUserId(req)),
    );
}

export async function uploadTransactions(req: Request, res: Response) {
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        throw AppError.badRequest("Missing transactions");
    }

    res.status(201).json(
        await financeRepository.insertTransactions(
            requireUserId(req),
            items.map(parseTransactionInput),
        ),
    );
}

export async function editTransactions(req: Request, res: Response) {
    const edits = req.body;

    if (!Array.isArray(edits) || edits.length === 0) {
        throw AppError.badRequest("Missing transaction edits");
    }

    const parsed: TransactionEdit[] = edits.map((edit) => {
        const { id, ...rest } = (edit ?? {}) as Partial<TransactionEdit>;

        if (!isFiniteNumber(id)) {
            throw AppError.badRequest("Missing id on transaction edit");
        }

        return { id, ...rest };
    });

    res.status(200).json(
        await financeRepository.updateTransactions(
            requireUserId(req),
            parsed,
        ),
    );
}

export async function deleteTransaction(req: Request, res: Response) {
    const transactionId = requireIdParam(req, "transactionId");

    const deleted = await financeRepository.deleteTransaction(
        transactionId,
        requireUserId(req),
    );

    if (!deleted) {
        throw AppError.notFound("Transaction not found or unauthorized");
    }

    res.status(200).json(deleted);
}

/* ------------------------------------------------------------ milestones -- */

export async function getMilestones(req: Request, res: Response) {
    res.status(200).json(
        await financeRepository.findMilestones(requireUserId(req)),
    );
}

export async function createMilestone(req: Request, res: Response) {
    const body = (req.body ?? {}) as Partial<CreateMilestoneRequest>;

    if (
        !body.name?.trim() ||
        !isFiniteNumber(body.targetAmount) ||
        body.targetAmount <= 0 ||
        !body.targetDate ||
        Number.isNaN(Date.parse(body.targetDate))
    ) {
        throw AppError.badRequest("Invalid milestone");
    }

    res.status(201).json(
        await financeRepository.insertMilestone(requireUserId(req), {
            name: body.name.trim(),
            targetAmount: body.targetAmount,
            targetDate: body.targetDate,
        }),
    );
}

export async function editMilestones(req: Request, res: Response) {
    const edits = req.body;

    if (!Array.isArray(edits) || edits.length === 0) {
        throw AppError.badRequest("Missing milestone edits");
    }

    const parsed: MilestoneEdit[] = edits.map((edit) => {
        const { id, ...rest } = (edit ?? {}) as Partial<MilestoneEdit>;

        if (!isFiniteNumber(id)) {
            throw AppError.badRequest("Missing id on milestone edit");
        }

        return { id, ...rest };
    });

    res.status(200).json(
        await financeRepository.updateMilestones(requireUserId(req), parsed),
    );
}

export async function deleteMilestone(req: Request, res: Response) {
    const milestoneId = requireIdParam(req, "milestoneId");

    const deleted = await financeRepository.deleteMilestone(
        milestoneId,
        requireUserId(req),
    );

    if (!deleted) {
        throw AppError.notFound("Milestone not found or unauthorized");
    }

    res.status(200).json(deleted);
}

/* ----------------------------------------------------------------- debts -- */

export async function getDebts(req: Request, res: Response) {
    res.status(200).json(
        await financeRepository.findDebts(requireUserId(req)),
    );
}

export async function createDebt(req: Request, res: Response) {
    const body = (req.body ?? {}) as Partial<CreateDebtRequest>;

    if (
        !body.name?.trim() ||
        !isFiniteNumber(body.balance) ||
        body.balance < 0 ||
        !isFiniteNumber(body.interestRate) ||
        body.interestRate < 0 ||
        !isFiniteNumber(body.minimumPayment) ||
        body.minimumPayment < 0
    ) {
        throw AppError.badRequest("Invalid debt");
    }

    res.status(201).json(
        await financeRepository.insertDebt(requireUserId(req), {
            name: body.name.trim(),
            balance: body.balance,
            interestRate: body.interestRate,
            minimumPayment: body.minimumPayment,
        }),
    );
}

export async function editDebts(req: Request, res: Response) {
    const edits = req.body;

    if (!Array.isArray(edits) || edits.length === 0) {
        throw AppError.badRequest("Missing debt edits");
    }

    const parsed: DebtEdit[] = edits.map((edit) => {
        const { id, ...rest } = (edit ?? {}) as Partial<DebtEdit>;

        if (!isFiniteNumber(id)) {
            throw AppError.badRequest("Missing id on debt edit");
        }

        return { id, ...rest };
    });

    res.status(200).json(
        await financeRepository.updateDebts(requireUserId(req), parsed),
    );
}

export async function deleteDebt(req: Request, res: Response) {
    const debtId = requireIdParam(req, "debtId");

    const deleted = await financeRepository.deleteDebt(
        debtId,
        requireUserId(req),
    );

    if (!deleted) {
        throw AppError.notFound("Debt not found or unauthorized");
    }

    res.status(200).json(deleted);
}

/* -------------------------------------------------------------- cash flow -- */

export async function getCashFlow(req: Request, res: Response) {
    res.status(200).json(
        await financeRepository.findCashFlow(requireUserId(req)),
    );
}
