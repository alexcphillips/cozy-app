import dotenv from "dotenv";
dotenv.config();

export const APP_CONFIG = {
    PORT: process.env.PORT,
    DB_PASSWORD: process.env.DB_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
} as const;
