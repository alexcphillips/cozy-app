import { Router } from "express";
import { API_PATHS } from "@cozy/shared";
import { asyncHandler } from "../../http/asyncHandler";
import { auth } from "../../middleware/auth";
import * as usersController from "./users.controller";

/**
 * Accounts and credentials. Registration and login are public; everything that
 * reads or mutates an existing account is behind `auth`.
 */
export const usersRouter: Router = Router();

usersRouter.post(
    API_PATHS.auth.register,
    asyncHandler(usersController.register),
);
usersRouter.post(API_PATHS.auth.login, asyncHandler(usersController.login));

usersRouter.get(
    API_PATHS.users.list,
    auth,
    asyncHandler(usersController.getAllUsers),
);
usersRouter.get(
    API_PATHS.users.byEmail,
    auth,
    asyncHandler(usersController.getUserByEmail),
);
usersRouter.delete(
    API_PATHS.users.byId,
    auth,
    asyncHandler(usersController.deleteUserById),
);
