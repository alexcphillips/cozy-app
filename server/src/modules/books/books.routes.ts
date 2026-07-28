import { Router } from "express";
import { API_PATHS } from "@cozy/shared";
import { asyncHandler } from "../../http/asyncHandler";
import * as booksController from "./books.controller";

/**
 * Book search. Public: it proxies a public catalogue and holds no user data.
 * The proxy exists so the Google API key stays server-side.
 */
export const booksRouter: Router = Router();

booksRouter.get(API_PATHS.books.search, asyncHandler(booksController.getBooks));
