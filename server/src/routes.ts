import { Router } from "express";
import { booksRouter } from "./modules/books/books.routes";
import { dietRouter } from "./modules/diet/diet.routes";
import { usersRouter } from "./modules/users/users.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";

/**
 * THE route manifest. Every module that serves HTTP is mounted here and
 * nowhere else, so this file answers "what endpoints does this server have?"
 *
 * Adding a feature:
 *   1. create `modules/<name>/` with `<name>.routes|controller|repository|sql.ts`
 *   2. declare its paths in `@cozy/shared` -> `contracts/api.paths.ts`
 *   3. add one line here
 */
export const apiRouter: Router = Router();

apiRouter.use(usersRouter);
apiRouter.use(analyticsRouter);
apiRouter.use(dietRouter);
apiRouter.use(booksRouter);
