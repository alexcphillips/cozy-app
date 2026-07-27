import express from "express";
import cors from "cors";
import { ENV } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import requestLogger from "./middleware/requestLogger";
import { apiRouter } from "./routes";

/**
 * Express wiring only. The order below is the request lifecycle, top to bottom:
 * cross-origin check -> body parsing -> logging -> routes -> 404 -> errors.
 *
 * No endpoint is declared in this file; they all live in `routes.ts`.
 */
const app = express();

app.use(
    cors({
        origin: ENV.CORS_ORIGINS,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(requestLogger);

app.use(apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
