import type { Request, Response } from "express";
import {
    validateEmail,
    validatePassword,
    validateUsername,
    VALIDATION_MESSAGES,
    type LoginRequest,
    type LoginResponse,
    type RegisterRequest,
} from "@cozy/shared";
import { AppError } from "../../http/AppError";
import { comparePassword, hashPassword } from "../../lib/crypto";
import { jwtUtil } from "../../lib/jwt";
import * as usersRepository from "./users.repository";

export async function getAllUsers(_req: Request, res: Response) {
    res.status(200).json(await usersRepository.findAllUsers());
}

export async function getUserByEmail(req: Request, res: Response) {
    const email = req.params.email;

    if (typeof email !== "string" || !email) {
        throw AppError.badRequest("Missing email");
    }

    const user = await usersRepository.findPublicUserByEmail(email);

    if (!user) {
        throw AppError.notFound("User not found");
    }

    res.status(200).json(user);
}

export async function register(req: Request, res: Response) {
    const { username, email, password } = (req.body ?? {}) as Partial<
        Record<keyof RegisterRequest, string>
    >;

    if (!username || !email || !password) {
        throw AppError.badRequest("Missing username, email, or password");
    }

    for (const result of [
        validateUsername(username),
        validateEmail(email),
        validatePassword(password),
    ]) {
        if (!result.isValid) {
            throw AppError.badRequest(
                result.errorMessage ?? VALIDATION_MESSAGES.INVALID_EMAIL_OR_PASSWORD,
            );
        }
    }

    // Same message as an invalid password, so this endpoint cannot be used to
    // enumerate which addresses have accounts.
    if (await usersRepository.findUserByEmail(email)) {
        throw AppError.badRequest(VALIDATION_MESSAGES.INVALID_EMAIL_OR_PASSWORD);
    }

    const user = await usersRepository.insertUser({
        username,
        email,
        passwordHash: await hashPassword(password),
    });

    res.status(201).json(user);
}

export async function login(req: Request, res: Response) {
    const { email, password } = (req.body ?? {}) as Partial<
        Record<keyof LoginRequest, string>
    >;

    if (!email || !password) {
        throw AppError.badRequest(
            VALIDATION_MESSAGES.INVALID_EMAIL_OR_PASSWORD,
        );
    }

    const user = await usersRepository.findUserByEmail(email);

    const isValid =
        user !== null && (await comparePassword(password, user.password_hash));

    if (!user || !isValid) {
        throw AppError.unauthorized(
            VALIDATION_MESSAGES.INVALID_EMAIL_OR_PASSWORD,
        );
    }

    const body: LoginResponse = { token: jwtUtil.signToken(user.id) };

    res.status(200).json(body);
}

export async function deleteUserById(req: Request, res: Response) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        throw AppError.badRequest("Must include a numeric id");
    }

    if (!(await usersRepository.deleteUserById(id))) {
        throw AppError.notFound("User not found");
    }

    res.status(204).send();
}
