export const FIND_WEIGHT_ENTRIES_BY_USER = `
  SELECT id, user_id, weight, created_at
  FROM weight_entries
  WHERE user_id = $1
  ORDER BY created_at DESC
`;

export const INSERT_WEIGHT_ENTRY = `
  INSERT INTO weight_entries (user_id, weight)
  VALUES ($1, $2)
  RETURNING id, user_id, weight, created_at
`;

export const FIND_ALL_FOOD_ITEMS = `
  SELECT id, name, unit_of_measurement, quantity,
         calories, protein, sugar, carbs, sodium,
         created_at, updated_at
  FROM food_item
  ORDER BY name
`;

export const INSERT_FOOD_ITEM = `
  INSERT INTO food_item (name, unit_of_measurement, quantity, calories, protein, sugar, carbs, sodium)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *
`;

/**
 * One row per logged food, with nutrition already scaled by the logged quantity
 * so the client renders it directly. `measurementText` is the display label.
 */
export const FIND_FOOD_LOG_BY_USER_AND_DATE = `
  SELECT
    fl.id,
    fl.quantity,
    fi.name,
    fi.unit_of_measurement,
    ROUND((COALESCE(fi.calories, 0) * fl.quantity)::numeric, 0) AS calories,
    ROUND((COALESCE(fi.protein, 0) * fl.quantity)::numeric, 1) AS protein,
    ROUND((COALESCE(fi.sugar, 0) * fl.quantity)::numeric, 1) AS sugar,
    ROUND((COALESCE(fi.carbs, 0) * fl.quantity)::numeric, 1) AS carbs,
    ROUND((COALESCE(fi.sodium, 0) * fl.quantity)::numeric, 0) AS sodium,
    CONCAT(fl.quantity, ' ', fi.unit_of_measurement) AS "measurementText"
  FROM food_log fl
  JOIN food_item fi ON fl.food_item_id = fi.id
  WHERE fl.user_id = $1 AND fl.log_user_date = $2
  ORDER BY fl.created_at DESC
`;

export const INSERT_FOOD_LOG = `
  INSERT INTO food_log (user_id, food_item_id, quantity, log_user_date)
  VALUES ($1, $2, $3, $4)
  RETURNING id, user_id, food_item_id, quantity, created_at, updated_at, log_user_date
`;

/**
 * Builds a multi-row INSERT for `rowCount` food log entries in one statement.
 * `rowCount` only controls how many `$n` placeholders are generated - actual
 * values always flow through `query()`'s params array, never interpolated here.
 */
export function buildInsertFoodLogBatchSql(rowCount: number): string {
    const valuesSql = Array.from({ length: rowCount }, (_, i) => {
        const base = i * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    }).join(", ");

    return `
  INSERT INTO food_log (user_id, food_item_id, quantity, log_user_date)
  VALUES ${valuesSql}
  RETURNING id, user_id, food_item_id, quantity, created_at, updated_at, log_user_date
`;
}

/** Scoped by `user_id` as well as `id` so one user cannot delete another's row. */
export const DELETE_FOOD_LOG_ITEM = `
  DELETE FROM food_log
  WHERE id = $1 AND user_id = $2
  RETURNING id, user_id, food_item_id, quantity, created_at, updated_at
`;
