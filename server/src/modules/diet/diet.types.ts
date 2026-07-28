/**
 * Rows exactly as Postgres returns them. NUMERIC columns arrive as `number`
 * because `db/pool.ts` installs a type parser for them.
 */
export type WeightEntryRow = {
    id: number;
    user_id: number;
    weight: number;
    created_at: string;
};

export type FoodItemRow = {
    id: string;
    name: string;
    unit_of_measurement: string;
    quantity: number;
    calories: number;
    protein: number;
    sugar: number;
    carbs: number;
    sodium: number;
    created_at: string;
    updated_at: string;
};

export type FoodLogRow = {
    id: string;
    user_id: number;
    food_item_id: string;
    quantity: number;
    created_at: string;
    updated_at: string;
};

/** The joined shape produced by `FIND_FOOD_LOG_BY_USER_AND_DATE`. */
export type FoodLogEntryRow = {
    id: string;
    quantity: number;
    name: string;
    unit_of_measurement: string;
    calories: number;
    protein: number;
    sugar: number;
    carbs: number;
    sodium: number;
    measurmentText: string;
};
