import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "@cozy/shared";
import { AUTH } from "../config/constants";
import { ENV } from "../config/env";

function signToken(userId: number): string {
    return jwt.sign({ userId } satisfies AuthTokenPayload, ENV.JWT_SECRET, {
        expiresIn: AUTH.TOKEN_TTL,
    });
}

/** Throws if the token is absent, expired, or forged. */
function verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, ENV.JWT_SECRET) as AuthTokenPayload;
}

export const jwtUtil = { signToken, verifyToken };
