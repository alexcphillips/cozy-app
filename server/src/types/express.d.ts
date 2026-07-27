import type { AuthTokenPayload } from "@cozy/shared";

declare module "express-serve-static-core" {
    interface Request {
        /**
         * Set by the `auth` middleware, so it is only guaranteed present on
         * routes mounted with that guard. Guarded controllers read it through a
         * small `requireUserId(req)` helper rather than scattering `!`.
         */
        user?: AuthTokenPayload;
    }
}
