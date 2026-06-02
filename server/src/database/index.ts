import { Pool, type QueryResult } from "pg";
import { APP_CONFIG } from "../app.config";

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: APP_CONFIG.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

export const query = (
    text: string,
    params?: unknown[],
): Promise<QueryResult> => {
    return pool.query(text, params);
};

export default pool;
