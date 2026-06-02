import express from "express";
import * as dietTracking from "./routes/dietTracking";
import * as users from "./routes/user";
import requestLogger from "./middleware/requestLogger";
import { auth } from "./middleware/auth";

const app = express();

app.use(express.json());
app.use(requestLogger);

app.get("/users", auth, users.getAllUsers);
app.get("/user/:email", auth, users.getUserByEmail);
app.get("/weight-entries", auth, dietTracking.getWeightEntriesByUser);

app.post("/register", users.register);
app.post("/login", users.login);
app.post("/weight-entries", auth, dietTracking.createWeightEntry);

app.delete("/user/:id", auth, users.deleteUserById);

export default app;
