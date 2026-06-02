import { type NextFunction, type Request, type Response } from "express";

export default function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const timestamp = new Date().toISOString();
    console.log(timestamp, "Handling a request!", req.url);

    next();
}
