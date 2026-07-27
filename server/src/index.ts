import app from "./app";
import { APP_CONFIG } from "./app.config";
import { seedDb } from "./database/seed";

(async () => {
    await seedDb();
    app.listen(APP_CONFIG.PORT, () => {
        console.log("Server started on port", APP_CONFIG.PORT);
    });
})();
