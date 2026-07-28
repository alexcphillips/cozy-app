import app from "./app";
import { ENV } from "./config/env";
import { ensureSchema } from "./db";

/**
 * Process entry point: bring the schema up to date, then listen. Everything
 * about *what* the server does lives in `app.ts` and `routes.ts`.
 */
async function start() {
    await ensureSchema();

    app.listen(ENV.PORT, () => {
        console.log(`Server listening on port ${ENV.PORT} (${ENV.NODE_ENV})`);
    });
}

start();
