import type { FoodItem, FoodLogEntry, WeightEntry } from "@cozy/shared";
import { query } from "../../db";
import {
    DELETE_FOOD_LOG_ITEM,
    FIND_ALL_FOOD_ITEMS,
    FIND_FOOD_LOG_BY_USER_AND_DATE,
    FIND_WEIGHT_ENTRIES_BY_USER,
    INSERT_FOOD_ITEM,
    INSERT_FOOD_LOG,
    INSERT_WEIGHT_ENTRY,
} from "./diet.sql";
import type {
    FoodItemRow,
    FoodLogEntryRow,
    FoodLogRow,
    WeightEntryRow,
} from "./diet.types";

/* ---------------------------------------------------------------- weight -- */

export async function findWeightEntries(
    userId: number,
): Promise<WeightEntry[]> {
    const rows = await query<WeightEntryRow>(FIND_WEIGHT_ENTRIES_BY_USER, [
        userId,
    ]);

    return rows.map(({ id, weight, created_at }) => ({
        id,
        weight,
        created_at,
    }));
}

export async function insertWeightEntry(
    userId: number,
    weight: number,
): Promise<WeightEntry> {
    const rows = await query<WeightEntryRow>(INSERT_WEIGHT_ENTRY, [
        userId,
        weight,
    ]);

    const row = rows[0];

    if (!row) {
        throw new Error("INSERT_WEIGHT_ENTRY returned no row");
    }

    return { id: row.id, weight: row.weight, created_at: row.created_at };
}

/* ------------------------------------------------------------ food items -- */

function toFoodItem(row: FoodItemRow): FoodItem {
    return {
        id: row.id,
        name: row.name,
        unit_of_measurement: row.unit_of_measurement,
        quantity: row.quantity,
        calories: row.calories,
        protein: row.protein,
        sugar: row.sugar,
        carbs: row.carbs,
        sodium: row.sodium,
    };
}

export async function findAllFoodItems(): Promise<FoodItem[]> {
    const rows = await query<FoodItemRow>(FIND_ALL_FOOD_ITEMS);
    return rows.map(toFoodItem);
}

export async function insertFoodItem(input: {
    name: string;
    unitOfMeasurement: string;
    quantity: number;
    calories: number;
    protein: number;
    sugar: number;
    carbs: number;
    sodium: number;
}): Promise<FoodItem> {
    const rows = await query<FoodItemRow>(INSERT_FOOD_ITEM, [
        input.name,
        input.unitOfMeasurement,
        input.quantity,
        input.calories,
        input.protein,
        input.sugar,
        input.carbs,
        input.sodium,
    ]);

    const row = rows[0];

    if (!row) {
        throw new Error("INSERT_FOOD_ITEM returned no row");
    }

    return toFoodItem(row);
}

/* -------------------------------------------------------------- food log -- */

export async function findFoodLog(
    userId: number,
    date: string,
): Promise<FoodLogEntry[]> {
    const q = await query("select * from food_log");
    console.log(q);
    return query<FoodLogEntryRow>(FIND_FOOD_LOG_BY_USER_AND_DATE, [
        userId,
        date,
    ]);
}

export async function insertFoodLog(
    userId: number,
    foodItemId: string,
    quantity: number,
): Promise<FoodLogRow> {
    const rows = await query<FoodLogRow>(INSERT_FOOD_LOG, [
        userId,
        foodItemId,
        quantity,
    ]);

    const row = rows[0];

    if (!row) {
        throw new Error("INSERT_FOOD_LOG returned no row");
    }

    return row;
}

/** @returns the deleted row, or `null` if it did not exist for this user. */
export async function deleteFoodLogItem(
    itemId: string,
    userId: number,
): Promise<FoodLogRow | null> {
    const rows = await query<FoodLogRow>(DELETE_FOOD_LOG_ITEM, [
        itemId,
        userId,
    ]);

    return rows[0] ?? null;
}
