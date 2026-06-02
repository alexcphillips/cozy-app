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

const GET_WEIGHT_ENTRIES_BY_USER_QUERY =
    "SELECT * FROM weight_entries WHERE user_id = $1 ORDER BY created_at DESC";
const CREATE_WEIGHT_ENTRY_QUERY =
    "INSERT INTO weight_entries (user_id, weight) VALUES ($1, $2) RETURNING *";
