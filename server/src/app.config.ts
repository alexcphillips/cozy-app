import dotenv from "dotenv";
dotenv.config();

export const APP_CONFIG = {
    PORT: process.env.PORT,
    DB_PASSWORD: process.env.DB_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
} as const;
