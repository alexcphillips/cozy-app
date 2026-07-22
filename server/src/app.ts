import express from "express";
import multer from "multer";
import * as dietTracking from "./routes/dietTracking";
import * as users from "./routes/user";
import requestLogger from "./middleware/requestLogger";
import { auth } from "./middleware/auth";
import * as books from "./routes/books";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(requestLogger);

app.get("/users", auth, users.getAllUsers);
app.get("/user/:email", auth, users.getUserByEmail);
app.get("/weight-entries", auth, dietTracking.getWeightEntriesByUser);
app.get("/book", books.getBook);

app.post("/register", users.register);
app.post("/login", users.login);
app.post("/weight-entries", auth, dietTracking.createWeightEntry);
app.post(
    "/nutrition-facts-entry",
    auth,
    upload.single("nutrition-facts"),
    dietTracking.createNutritionFactsEntry,
);

app.delete("/user/:id", auth, users.deleteUserById);

export default app;
