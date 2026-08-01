export type WeightEntry = {
    id: number;
    /** Kilograms or pounds - the app is unit-agnostic and stores what it is given. */
    weight: number;
    created_at: string;
};

export type CreateWeightEntryRequest = {
    weight: number;
};

export type UnitOfMeasurement = string;

/** A food definition in the shared catalogue. Not user-scoped. */
export type FoodItem = {
    id: string;
    name: string;
    unit_of_measurement: UnitOfMeasurement;
    quantity: number;
    calories: number;
    protein: number;
    sugar: number;
    carbs: number;
    sodium: number;
};

export type CreateFoodItemRequest = {
    name: string;
    unitOfMeasurement: UnitOfMeasurement;
    quantity: number;
    calories?: number;
    protein?: number;
    sugar?: number;
    carbs?: number;
    sodium?: number;
    /** When true the new item is also written to today's log in one round trip. */
    iAteThisToday?: boolean;
    localDate?: string;
};

/**
 * One row of a user's daily log: the food item's nutrition already multiplied
 * by the logged quantity, so the client never recomputes it.
 */
export type FoodLogEntry = {
    id: string;
    name: string;
    quantity: number;
    unit_of_measurement: UnitOfMeasurement;
    /** Pre-formatted "2 cups" label for table display. */
    measurementText: string;
    calories: number;
    protein: number;
    sugar: number;
    carbs: number;
    sodium: number;
};

export type CreateFoodLogRequest = {
    foodItemId: string;
    quantity: number;
    localDate?: string;
};

export type FoodLogQuery = {
    /** Any `Date.parse`-able day, e.g. "1/31/2026". */
    date: string;
};
