import { Router } from "express";
import { GEO_API_PATHS } from "@cozy/shared/geo";
import { asyncHandler } from "../../../http/asyncHandler";
import * as contentController from "./geo-content.controller";

/** Public: nothing here is per-player. */
export const geoContentRouter: Router = Router();

geoContentRouter.get(GEO_API_PATHS.health, asyncHandler(contentController.getHealth));
geoContentRouter.get(GEO_API_PATHS.content, asyncHandler(contentController.getContent));
