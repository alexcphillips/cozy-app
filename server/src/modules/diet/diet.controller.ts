import type { Request, Response } from "express";
import type {
    CreateFoodItemRequest,
    CreateFoodLogRequest,
    CreateWeightEntryRequest,
} from "@cozy/shared";
import { AppError } from "../../http/AppError";
import * as dietRepository from "./diet.repository";

/** Every route in this module is mounted behind `auth`, so `req.user` is set. */
function requireUserId(req: Request): number {
    return req.user!.userId;
}

function toNonNegativeNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/* ---------------------------------------------------------------- weight -- */

export async function getWeightEntries(req: Request, res: Response) {
    res.status(200).json(
        await dietRepository.findWeightEntries(requireUserId(req)),
    );
}

export async function createWeightEntry(req: Request, res: Response) {
    const { weight } = (req.body ?? {}) as Partial<CreateWeightEntryRequest>;
    const parsed = Number(weight);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw AppError.badRequest("Invalid weight value");
    }

    res.status(201).json(
        await dietRepository.insertWeightEntry(requireUserId(req), parsed),
    );
}

/* ------------------------------------------------------------ food items -- */

export async function getAllFoodItems(_req: Request, res: Response) {
    res.status(200).json(await dietRepository.findAllFoodItems());
}

export async function createFoodItem(req: Request, res: Response) {
    const body = (req.body ?? {}) as Partial<CreateFoodItemRequest>;

    if (
        !body.name?.trim() ||
        !body.unitOfMeasurement ||
        body.quantity == null
    ) {
        throw AppError.badRequest(
            "Missing name, unitOfMeasurement, or quantity",
        );
    }

    const quantity = Number(body.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
        throw AppError.badRequest("Invalid quantity");
    }

    const foodItem = await dietRepository.insertFoodItem({
        name: body.name.trim(),
        unitOfMeasurement: body.unitOfMeasurement,
        quantity,
        calories: toNonNegativeNumber(body.calories),
        protein: toNonNegativeNumber(body.protein),
        sugar: toNonNegativeNumber(body.sugar),
        carbs: toNonNegativeNumber(body.carbs),
        sodium: toNonNegativeNumber(body.sodium),
    });

    // Convenience path: creating a food you just ate also logs it, so the UI
    // does not need a second round trip.
    if (body.iAteThisToday) {
        await dietRepository.insertFoodLog(
            requireUserId(req),
            foodItem.id,
            foodItem.quantity,
        );
    }

    res.status(201).json(foodItem);
}

/* -------------------------------------------------------------- food log -- */

export async function getFoodLog(req: Request, res: Response) {
    const date = req.query.date;

    if (typeof date !== "string" || Number.isNaN(Date.parse(date))) {
        throw AppError.badRequest("Invalid or missing date parameter");
    }

    const UTCDate = new Date(date).toISOString();

    res.status(200).json(
        await dietRepository.findFoodLog(requireUserId(req), UTCDate),
    );
}

export async function createFoodLog(req: Request, res: Response) {
    const { foodItemId, quantity } = (req.body ??
        {}) as Partial<CreateFoodLogRequest>;

    const parsedQuantity = Number(quantity);

    if (
        !foodItemId ||
        !Number.isFinite(parsedQuantity) ||
        parsedQuantity <= 0
    ) {
        throw AppError.badRequest("Missing or invalid foodItemId or quantity");
    }

    res.status(201).json(
        await dietRepository.insertFoodLog(
            requireUserId(req),
            foodItemId,
            parsedQuantity,
        ),
    );
}

export async function deleteFoodLogItem(req: Request, res: Response) {
    const itemId = req.params.itemId;

    if (typeof itemId !== "string" || !itemId) {
        throw AppError.badRequest("Invalid or missing item id");
    }

    const deleted = await dietRepository.deleteFoodLogItem(
        itemId,
        requireUserId(req),
    );

    if (!deleted) {
        throw AppError.notFound("Entry not found or unauthorized");
    }

    res.status(200).json(deleted);
}
