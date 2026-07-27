import { Router } from "express";
import { API_PATHS } from "@cozy/shared";
import { asyncHandler } from "../../http/asyncHandler";
import { auth } from "../../middleware/auth";
import * as dietController from "./diet.controller";

/**
 * Weight tracking and the food log. Every row here is user-scoped, so every
 * route carries `auth` explicitly - the guard is declared where the route is,
 * not inherited from a `router.use` further up.
 */
export const dietRouter: Router = Router();

dietRouter.get(
    API_PATHS.diet.weightEntries,
    auth,
    asyncHandler(dietController.getWeightEntries),
);
dietRouter.post(
    API_PATHS.diet.weightEntries,
    auth,
    asyncHandler(dietController.createWeightEntry),
);

dietRouter.get(
    API_PATHS.diet.foodItems,
    auth,
    asyncHandler(dietController.getAllFoodItems),
);
dietRouter.post(
    API_PATHS.diet.foodItems_create,
    auth,
    asyncHandler(dietController.createFoodItem),
);

dietRouter.get(
    API_PATHS.diet.foodLog,
    auth,
    asyncHandler(dietController.getFoodLog),
);
dietRouter.post(
    API_PATHS.diet.foodLog,
    auth,
    asyncHandler(dietController.createFoodLog),
);
dietRouter.delete(
    API_PATHS.diet.foodLogItem,
    auth,
    asyncHandler(dietController.deleteFoodLogItem),
);
