import express from "express";
import cors from "cors";
import requestLogger from "./middleware/requestLogger";
import { auth } from "./middleware/auth";
import * as dietTracking from "./routes/dietTracking";
import * as users from "./routes/user";
import * as books from "./routes/books";

const app = express();

app.use(
    cors({
        origin: ["https://haileysbookshelf.com", "http://localhost:5173"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(requestLogger);

app.get("/users", auth, users.getAllUsers);
app.get("/user/:email", auth, users.getUserByEmail);
app.get("/weight-entries", auth, dietTracking.getWeightEntriesByUser);
app.get("/book", books.getBook);
app.get("/food-log", auth, dietTracking.getFoodLogByUser);
app.get("/food-items", auth, dietTracking.getAllFoodItems);

app.post("/register", users.register);
app.post("/login", users.login);
app.post("/weight-entries", auth, dietTracking.createWeightEntry);
app.post("/food-log", auth, dietTracking.createFoodLog);
app.post("/food-entry", auth, dietTracking.createFoodItem);

app.delete("/user/:id", auth, users.deleteUserById);

app.delete("/food-log/:itemId", auth, dietTracking.deleteFoodLogItemById);

export default app;
