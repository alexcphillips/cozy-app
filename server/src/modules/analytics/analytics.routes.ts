import { Router } from "express";
import { API_PATHS } from "@cozy/shared";
import { asyncHandler } from "../../http/asyncHandler";
import { auth } from "../../middleware/auth";
import * as analyticsController from "./analytics.controller";
import { admin } from "../../middleware/admin";

export const analyticsRouter: Router = Router();

analyticsRouter.get(
    API_PATHS.analytics.events,
    auth,
    admin,
    asyncHandler(analyticsController.getAnalyticsEvents),
);

analyticsRouter.post(
    API_PATHS.analytics.event,
    auth,
    asyncHandler(analyticsController.createAnalyticsEvent),
);
