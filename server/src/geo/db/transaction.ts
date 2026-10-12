import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "../../db";

/** A query function bound to one transaction. */
export type TxQuery = <Row extends QueryResultRow>(
    text: string,
    params?: readonly unknown[],
) => Promise<Row[]>;

/** Postgres gave up on the transaction, not the work: deadlock, serialization. */
const RETRYABLE = new Set(["40P01", "40001"]);
const ATTEMPTS = 3;

/**
 * Runs `work` in one transaction: commits if it resolves, rolls back if it
 * throws. Anything touching more than one row that must agree — a turn and
 * its card charges, loot and XP, a trade's coins and items — goes through here.
 *
 * Two trades locking the same players in opposite orders can deadlock;
 * Postgres then aborts one, and it's run again from the start (up to 3 tries),
 * so `work` must only touch the database through `tx`.
 */
export async function withTransaction<T>(work: (tx: TxQuery) => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await runOnce(work);
        } catch (error) {
            const code = (error as { code?: string }).code;
            if (attempt >= ATTEMPTS || !code || !RETRYABLE.has(code)) throw error;
        }
    }
}

async function runOnce<T>(work: (tx: TxQuery) => Promise<T>): Promise<T> {
    const client: PoolClient = await pool.connect();
    const tx: TxQuery = async (text, params = []) =>
        (await client.query(text, params as unknown[])).rows;

    try {
        await client.query("BEGIN");
        const result = await work(tx);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
