import { type NextFunction, type Request, type Response } from "express";
import { AppError } from "../http/AppError";
import { query } from "../db";

type AdminRow = {
    is_admin: boolean;
};

export async function admin(req: Request, _res: Response, next: NextFunction) {
    const rows = await query<AdminRow>(
        `
            SELECT is_admin
            FROM users
            WHERE id = $1
        `,
        [req.user!.userId],
    );

    const user = rows[0];

    if (!user?.is_admin) {
        return next(AppError.forbidden("Admin access required"));
    }

    next();
}
