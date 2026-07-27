import { query } from "./index";

export async function seedDb() {
    try {
        console.log("Checking and seeding database tables...");

        await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        // Independent Parent Tables
        await query(CREATE_USERS_TABLE_QUERY);
        await query(CREATE_FOOD_ITEM_TABLE_QUERY);

        // Dependent Child Tables
        await query(CREATE_FOOD_LOG_TABLE_QUERY);
        await query(CREATE_WEIGHT_ENTRIES_TABLE_QUERY);

        console.log("Database tables verified and ready! 🎉");
    } catch (error) {
        console.error("Critical error during database seeding:", error);
        process.exit(1); // Crash the container process if table creation fails
    }
}

const CREATE_USERS_TABLE_QUERY = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_FOOD_ITEM_TABLE_QUERY = `
  CREATE TABLE IF NOT EXISTS food_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    unit_of_measurement VARCHAR(50) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    calories NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    protein NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sugar NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    carbs NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sodium NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT check_positive_quantity CHECK (quantity >= 0),
    CONSTRAINT check_positive_calories CHECK (calories >= 0),
    CONSTRAINT check_positive_protein CHECK (protein >= 0),
    CONSTRAINT check_positive_sugar CHECK (sugar >= 0),
    CONSTRAINT check_positive_carbs CHECK (carbs >= 0),
    CONSTRAINT check_positive_sodium CHECK (sodium >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_FOOD_LOG_TABLE_QUERY = `
  CREATE TABLE IF NOT EXISTS food_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES food_item(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_log_quantity CHECK (quantity >= 0)
  );
`;

const CREATE_WEIGHT_ENTRIES_TABLE_QUERY = `
  CREATE TABLE IF NOT EXISTS weight_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;
