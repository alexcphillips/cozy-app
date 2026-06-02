import { type Request, type Response } from "express";
import pool from "../database";
import { comparePassword, hashPassword } from "../utils/crypto";
import { APP_CONSTANTS } from "../app.constants";
import validatePassword from "../utils/validatePassword";
import { validateEmail } from "../utils/validateEmail";
import { jwtUtil } from "../utils/jwt";

export async function getAllUsers(req: Request, res: Response) {
    const result = await pool.query(GET_ALL_USERS_QUERY);
    return res.status(200).send(result.rows);
}

export async function getUserByEmail(req: Request, res: Response) {
    const result = await pool.query(GET_USER_BY_EMAIL_QUERY, [
        req.params.email,
    ]);

    return res.status(200).send(result.rows);
}

export async function register(req: Request, res: Response) {
    if (
        !req.body ||
        !req.body.username ||
        !req.body.email ||
        !req.body.password
    ) {
        return res.status(400).send("Missing username, email, or password");
    }

    const { username, email, password } = req.body;

    const isExistingEmailResult = await pool.query(GET_USER_BY_EMAIL_QUERY, [
        email,
    ]);

    if (isExistingEmailResult.rows.length) {
        return res.status(400).send("Invalid email or password");
    }

    const validateEmailResult = validateEmail(email);
    const validatePasswordResult = validatePassword(password);

    if (!validateEmailResult.isValid || !validatePasswordResult.isValid) {
        const errorMessage =
            validateEmailResult.errorMessage ||
            validatePasswordResult.errorMessage;

        if (errorMessage) {
            return res.status(400).send(errorMessage);
        } else {
            // failed to extract or identify error
            return res
                .status(500)
                .send(
                    APP_CONSTANTS.auth
                        .EMAIL_OR_PASSWORD_VALIDATION_UNKNOWN_ISSUE,
                );
        }
    }

    const hashedPassword = await hashPassword(password);

    try {
        const result = await pool.query(CREATE_USER_QUERY, [
            username,
            email,
            hashedPassword,
        ]);

        return res.status(201).send(result.rows[0]);
    } catch (err) {
        console.error(`Caught createUser db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

export async function login(req: Request, res: Response) {
    if (!req.body || !req.body.email || !req.body.password) {
        return res
            .status(400)
            .send(APP_CONSTANTS.auth.INVALID_EMAIL_OR_PASSWORD_TEXT);
    }
    const { email, password } = req.body;

    try {
        const result = await pool.query(GET_USER_BY_EMAIL_QUERY, [email]);

        const user = result.rows[0];

        if (!user) {
            return res
                .status(401)
                .send(APP_CONSTANTS.auth.INVALID_EMAIL_OR_PASSWORD_TEXT);
        }

        const valid = await comparePassword(password, user.password_hash);

        if (!valid) {
            return res
                .status(401)
                .send(APP_CONSTANTS.auth.INVALID_EMAIL_OR_PASSWORD_TEXT);
        }

        const token = jwtUtil.signToken(user.id);

        return res.status(200).send({ token });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Server error");
    }
}

export async function deleteUserById(req: Request, res: Response) {
    if (!req.params.id) return res.status(400).send("Must include id");

    const result = await pool.query(DELETE_USER_BY_ID_QUERY, [req.params.id]);

    return res.status(200).send(result.rows);
}

const GET_ALL_USERS_QUERY = "SELECT * FROM users";
const GET_USER_BY_EMAIL_QUERY = "SELECT * FROM users WHERE email = $1";

const CREATE_USER_QUERY =
    "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id";

const DELETE_USER_BY_ID_QUERY = "DELETE FROM users WHERE id = $1";
