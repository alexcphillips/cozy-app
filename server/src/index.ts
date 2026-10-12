import app from "./app";
import { ENV } from "./config/env";
import { ensureSchema } from "./db";
import { ensureGeoSchema } from "./geo/db/geo.schema";
import { startGeoJobs } from "./geo/jobs";

/**
 * Process entry point: bring the schema up to date, then listen. Everything
 * about *what* the server does lives in `app.ts` and `routes.ts`.
 */
async function start() {
    await ensureSchema();
    await ensureGeoSchema();
    startGeoJobs();

    app.listen(ENV.PORT, () => {
        console.log(`Server listening on port ${ENV.PORT} (${ENV.NODE_ENV})`);
    });
}

start();
