import jwt from "jsonwebtoken";
import { APP_CONFIG } from "../app.config";

function signToken(userId: number) {
    return jwt.sign({ userId }, APP_CONFIG.JWT_SECRET as string, {
        expiresIn: "7d",
    });
}

function verifyToken(token: string) {
    return jwt.verify(token, APP_CONFIG.JWT_SECRET as string) as {
        userId: number;
    };
}

export const jwtUtil = { signToken, verifyToken };
