import { Router } from "express";

/**
 * Not yet mounted in `server/src/routes.ts` - the game currently runs entirely
 * in the browser (`ui/src/features/game`). The engine, models and systems in
 * this folder are the server-authoritative simulation being built to replace
 * it. Add routes here plus one `apiRouter.use(gameRouter)` line when it lands.
 */
export const gameRouter: Router = Router();
