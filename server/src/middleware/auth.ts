import { type NextFunction, type Request, type Response } from "express";
import { APP_CONSTANTS } from "../app.constants";
import { jwtUtil } from "../utils/jwt";

export function auth(req: Request, res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization;

        if (!header)
            return res.status(400).send(APP_CONSTANTS.auth.MISSING_TOKEN_TEXT);

        const token = header.split(" ")[1];

        const decoded = jwtUtil.verifyToken(token);

        req.user = decoded;

        next();
    } catch (err) {
        console.error(err);
        return res.status(401).send(APP_CONSTANTS.auth.INVALID_TOKEN_TEXT);
    }
}
