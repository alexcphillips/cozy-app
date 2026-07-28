import { type NextFunction, type Request, type Response } from "express";
import { AUTH } from "../config/constants";
import { AppError } from "../http/AppError";
import { jwtUtil } from "../lib/jwt";

/**
 * Populates `req.user` from the bearer token, or rejects. Any route mounted
 * with this guard may safely read `req.user!` in its controller.
 */
export function auth(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.split(" ")[1];

    if (!token) {
        return next(AppError.unauthorized(AUTH.MISSING_TOKEN_TEXT));
    }

    try {
        req.user = jwtUtil.verifyToken(token);
        next();
    } catch {
        next(AppError.unauthorized(AUTH.INVALID_TOKEN_TEXT));
    }
}
