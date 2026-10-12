import { Router } from "express";
import { API_PATHS } from "@cozy/shared";
import { asyncHandler } from "../../http/asyncHandler";
import { auth } from "../../middleware/auth";
import * as booksController from "./books.controller";

/**
 * Book search and the personal library.
 *
 * Search is public: it proxies a public catalogue and holds no user data. The
 * proxy exists so the Google API key stays server-side.
 *
 * Everything under `/library` is user-scoped, so each of those routes carries
 * `auth` explicitly - the guard is declared where the route is, not inherited
 * from a `router.use` further up.
 */
export const booksRouter: Router = Router();

booksRouter.get(API_PATHS.books.search, asyncHandler(booksController.getBooks));

booksRouter.get(
    API_PATHS.books.library,
    auth,
    asyncHandler(booksController.getLibrary),
);
booksRouter.post(
    API_PATHS.books.library,
    auth,
    asyncHandler(booksController.addToLibrary),
);
booksRouter.patch(
    API_PATHS.books.libraryItem,
    auth,
    asyncHandler(booksController.updateReadingStatus),
);
booksRouter.post(
    API_PATHS.books.libraryItemProgress,
    auth,
    asyncHandler(booksController.logReadingProgress),
);
