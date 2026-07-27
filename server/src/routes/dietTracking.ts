import { type Request, type Response } from "express";
import { query } from "../database";

export async function getWeightEntriesByUser(req: Request, res: Response) {
    try {
        const result = await query(GET_WEIGHT_ENTRIES_BY_USER_QUERY, [
            req.user!.userId,
        ]);
        return res.status(200).send(result.rows);
    } catch (err) {
        console.error(`Caught getWeightEntries db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

export async function createWeightEntry(req: Request, res: Response) {
    const userId = req.user!.userId;
    const weight = req.body.weight;

    if (!weight) {
        return res.status(400).send("Invalid weight value");
    }

    try {
        const result = await query(CREATE_WEIGHT_ENTRY_QUERY, [userId, weight]);
        return res.status(201).send(result.rows);
    } catch (err) {
        console.error(`Caught createWeightEntry db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

export async function createFoodItem(req: Request, res: Response) {
    const userId = req.user!.userId;
    const {
        name,
        unitOfMeasurement,
        quantity,
        calories,
        protein,
        sugar,
        carbs,
        sodium,
        iAteThisToday,
    } = req.body;

    const requiredFields = ["name", "unitOfMeasurement", "quantity"];
    for (const field of requiredFields) {
        if (
            req.body[field] === undefined ||
            req.body[field] === null ||
            req.body[field] === ""
        ) {
            return res.status(400).send(`Missing field ${field}`);
        }
    }

    try {
        const foodItemResult = await query(CREATE_FOOD_ITEM_QUERY, [
            name.trim(),
            unitOfMeasurement,
            Number(quantity),
            Number(calories) || 0,
            Number(protein) || 0,
            Number(sugar) || 0,
            Number(carbs) || 0,
            Number(sodium) || 0,
        ]);

        const newFoodItem = foodItemResult.rows[0];

        if (iAteThisToday) {
            await query(INSERT_FOOD_LOG_QUERY, [
                userId,
                newFoodItem.id,
                newFoodItem.quantity,
            ]);
        }

        return res.status(201).json(newFoodItem.name);
    } catch (err) {
        console.error(`Caught createFoodItem db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

export async function getFoodLogByUser(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { date } = req.query;

    if (!date || Number.isNaN(Date.parse(String(date)))) {
        return res.status(400).send("Invalid or missing date parameter");
    }

    try {
        const result = await query(GET_FOOD_LOG_BY_USER_QUERY, [userId, date]);
        return res.status(200).send(result.rows);
    } catch (err) {
        console.error(`Caught getFoodLogByUser db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

export async function createFoodLog(req: Request, res: Response) {
    const userId = req.user!.userId;
    const { foodItemId, quantity } = req.body;

    if (!foodItemId || !quantity) {
        return res.status(400).send("Missing foodItemId or quantity");
    }

    try {
        const result = await query(INSERT_FOOD_LOG_QUERY, [
            userId,
            foodItemId,
            Number(quantity),
        ]);
        return res.status(201).send(result.rows[0]);
    } catch (err) {
        console.error(`Caught createFoodLog db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

export async function getAllFoodItems(req: Request, res: Response) {
    try {
        const result = await query(GET_ALL_FOOD_ITEMS_QUERY);
        return res.status(200).send(result.rows);
    } catch (err) {
        console.error(`Caught getAllFoodItems db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

export async function deleteFoodLogItemById(req: Request, res: Response) {
    const userId = req.user!.userId;
    const rowId = req.params.itemId;

    if (!rowId) {
        return res.status(400).send("Invalid or missing item id");
    }

    try {
        const result = await query(DELETE_FOOD_LOG_ITEM_BY_ID_QUERY, [
            rowId,
            userId,
        ]);

        if (result.rowCount === 0) {
            return res.status(404).send("Entry not found or unauthorized");
        }

        return res.status(200).send(result.rows[0]);
    } catch (err) {
        console.error(`Caught deleteFoodLogItemById db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

const GET_WEIGHT_ENTRIES_BY_USER_QUERY = `
  SELECT * FROM weight_entries 
  WHERE user_id = $1 
  ORDER BY created_at DESC
`;

const GET_ALL_FOOD_ITEMS_QUERY = `
  SELECT * FROM food_item
`;

const GET_FOOD_LOG_BY_USER_QUERY = `
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
    CONCAT(fl.quantity, ' ', fi.unit_of_measurement) AS "measurmentText"
  FROM food_log fl
  JOIN food_item fi ON fl.food_item_id = fi.id
  WHERE fl.user_id = $1 AND fl.created_at::date = $2
  ORDER BY fl.created_at DESC
`;

const CREATE_WEIGHT_ENTRY_QUERY = `
  INSERT INTO weight_entries (user_id, weight) 
  VALUES ($1, $2) 
  RETURNING *
`;

const CREATE_FOOD_ITEM_QUERY = `
  INSERT INTO food_item (name, unit_of_measurement, quantity, calories, protein, sugar, carbs, sodium) 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
  RETURNING *
`;

const INSERT_FOOD_LOG_QUERY = `
  INSERT INTO food_log (user_id, food_item_id, quantity) 
  VALUES ($1, $2, $3) 
  RETURNING *
`;

const DELETE_FOOD_LOG_ITEM_BY_ID_QUERY = `
  DELETE FROM food_log 
  WHERE id = $1 AND user_id = $2 
  RETURNING *
`;
