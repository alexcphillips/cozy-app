import { Router } from "express";
import { geoAccountsRouter } from "./modules/accounts/geo-accounts.routes";
import { geoAdminRouter } from "./modules/admin/geo-admin.routes";
import { geoChestsRouter } from "./modules/chests/geo-chests.routes";
import { geoContentRouter } from "./modules/content/geo-content.routes";
import { geoCraftingRouter } from "./modules/crafting/geo-crafting.routes";
import { geoFarmingRouter } from "./modules/farming/geo-farming.routes";
import { geoFishingRouter } from "./modules/fishing/geo-fishing.routes";
import { geoFeedbackRouter } from "./modules/feedback/geo-feedback.routes";
import { geoFriendsRouter } from "./modules/friends/geo-friends.routes";
import { geoInboxRouter } from "./modules/inbox/geo-inbox.routes";
import { geoMarketRouter } from "./modules/market/geo-market.routes";
import { geoMayorRouter } from "./modules/mayor/geo-mayor.routes";
import { geoPlacesRouter } from "./modules/places/geo-places.routes";
import { geoPlayerRouter } from "./modules/player/geo-player.routes";
import { geoRunsRouter } from "./modules/runs/geo-runs.routes";
import { geoSuggestionsRouter } from "./modules/suggestions/geo-suggestions.routes";
import { geoVendorsRouter } from "./modules/vendors/geo-vendors.routes";
import { geoWorldRouter } from "./modules/world/geo-world.routes";

/**
 * geo-game's route manifest: every geo module, mounted once. cozy-app's
 * `routes.ts` mounts this single router, so geo-game is one line there.
 * Paths all start with `/geo` (`@cozy/shared/geo` → GEO_API_PATHS).
 */
export const geoRouter: Router = Router();

geoRouter.use(geoContentRouter);
geoRouter.use(geoAccountsRouter);
geoRouter.use(geoPlayerRouter);
geoRouter.use(geoRunsRouter);
geoRouter.use(geoFishingRouter);
geoRouter.use(geoFarmingRouter);
geoRouter.use(geoChestsRouter);
geoRouter.use(geoWorldRouter);
geoRouter.use(geoPlacesRouter);
geoRouter.use(geoVendorsRouter);
geoRouter.use(geoCraftingRouter);
geoRouter.use(geoMarketRouter);
geoRouter.use(geoMayorRouter);
geoRouter.use(geoFriendsRouter);
geoRouter.use(geoSuggestionsRouter);
geoRouter.use(geoInboxRouter);
geoRouter.use(geoFeedbackRouter);
geoRouter.use(geoAdminRouter);
