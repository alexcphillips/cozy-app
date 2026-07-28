What the layout is now
Three npm workspaces, with ui and server unable to import each other — both go through shared:


ui/       React SPA (Vite)   ─┐
shared/   @cozy/shared        ├─ the only legal edge is ui→shared←server
server/   Express API (tsx)  ─┘
server/src/modules/<name>/ — every module is the same four files in the same order of abstraction: *.routes.ts (path + guard) → *.controller.ts (validation, HTTP) → *.repository.ts (row→contract mapping, the only place SQL runs) → *.sql.ts. One directory holds the whole feature.

ui/src/features/<name>/ — api/ components/ hooks/ pages/ stores/. The old pages/ + components/ui/ + hooks/ + store/ + config/ split meant the food log lived in four directories that never said "diet"; it's now one.

shared/ — API_PATHS (every URL declared once, used by both the Express router and the React API client), request/response contracts, and the credential rules.

Four navigation anchors, each self-describing in its header: routes.ts (endpoints), routes.tsx (screens), api.paths.ts (URLs), env.ts (config).

Verification
npm run verify — typecheck (3 workspaces), lint, build — all green. I also introspected the booted Express app: it registers the same 13 routes as before the split.

Bugs the restructure surfaced (all fixed, all listed in §7 of the report)
The ones worth naming: password rules had silently diverged (client >=8, server 8..32); the server sent nextPageExists while Library.tsx read doesNextPageExist, so pagination was permanently dead; every book search fetched the next page too, just to test existence; apiFetch forced Content-Type: application/json onto FormData uploads; and setWeightEntries([...newEntry, ...current]) spread an object as an array — a TypeError on every successful weight submission.

Two judgment calls you may want to revisit
I deleted src/game/ui/HUDLayer.tsx — fully commented out and duplicating the live components/HUDLayer. Recoverable from git history.
pg NUMERIC now parses to number in db/pool.ts rather than arriving as a string. This is what let the contract honestly say calories: number, but it is a runtime behavior change, not just a move.
The full rationale is in ARCHITECTURE.md, including a "where does X go?" table and a §8 listing what I deliberately left alone — no tests exist, schema.ts is not a migration runner, ~30 empty placeholder files were preserved, and modules/game/ is intentionally unmounted.
