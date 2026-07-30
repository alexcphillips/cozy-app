import type { Request, Response } from "express";
import * as analyticsRepository from "./analytics.repository";
import validateAnalyticsRequest from "./analytics.validation";
import { AppError } from "../../http/AppError";

export async function getAnalyticsEvents(req: Request, res: Response) {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const eventParam = req.query.event;
    const userIdParam = req.query.userId;

    if (typeof startDate !== "string" || typeof endDate !== "string") {
        throw new AppError(400, "startDate and endDate are required");
    }

    let event: string | undefined;
    if (typeof eventParam === "string" && eventParam.trim() !== "") {
        event = eventParam;
    }

    let userId: number | undefined;
    if (typeof userIdParam === "string") {
        userId = Number(userIdParam);
        if (!Number.isInteger(userId) || userId <= 0) {
            throw new AppError(400, "userId must be a positive integer");
        }
    }

    const events = await analyticsRepository.getAnalyticsEvents(
        startDate,
        endDate,
        userId,
        event,
    );

    return res.status(200).json(events);
}

export async function createAnalyticsEvent(req: Request, res: Response) {
    const body: unknown = req.body;

    if (!validateAnalyticsRequest(body)) {
        throw new AppError(400, "Invalid analytics event");
    }

    const userId = req.user!.userId;

    const properties =
        (body.properties as Record<string, unknown> | undefined) ?? null;

    await analyticsRepository.insertAnalyticsEvent(
        userId,
        body.name,
        properties,
    );

    return res.sendStatus(201);
}
