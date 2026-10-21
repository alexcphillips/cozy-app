Read ARCHITECTURE.md for the repo's layout. Most work here is geo-game's backend, below.

# geo-game backend

- Lives in `server/src/geo/` and `shared/src/geo/` only; its tables are in the `geo` Postgres schema. Start with `server/src/geo/README.md` (layout, modules) and `server/src/geo/data/README.md` (content).
- cozy-app knows geo by three lines (`routes.ts`, and two in `index.ts`). Keep edits to cozy-app's own files to that; ask before changing a shared one (`app.ts`, `middleware/`, `http/`).
- The app is `../geo-game`. After changing anything in `shared/src/geo/`, run `npm run sync:contracts` there.

## Checking work

- `npm run check:geo`: typecheck (shared + server), eslint on the geo folders, `test:geo`, then `geo:data`.
- `npm run smoke:geo-<area> --workspace @cozy/server` runs an end-to-end suite against the dev database (throwaway accounts, cleaned up). The list is in `server/package.json`.
- `npm run geo:data --workspace @cozy/server` checks content alone.

## Conventions

- Modules are four files: `*.routes.ts`, `*.controller.ts` (read and check the request), `*.repository.ts` (all database work), `*.sql.ts` (the SQL text).
- Reject with `AppError` (`badRequest`, `notFound`…), never `res.status(4xx)`. Shared request checks are in `lib/validate.ts` (`isUuid`, `wholeNumber`), each taking the endpoint's own error. A malformed id that reaches Postgres still becomes a 400 (`middleware/geo-db-errors.ts`).
- Anything writing more than one row runs in `withTransaction`, takes `playerRepository.lockPlayer` first, and only queries through `tx`. Mid-Run guards: `runsRepository.assertNotInRun`, `assertHandNotInRun`.
- Content is one TypeScript file per thing in `data/`, typed `satisfies <Model>` from `#geo/models`. The loader checks it at boot.
- Combat rules are data (`data/EFFECTS.md`); a new trigger, condition or action goes in `engine/engine.types.ts` and `engine/battle.ts`, with a test.
- `world/app-sprites.generated.ts` is written by geo-game's sprite generator (runs on its `npm start`, or `npm run assets`); don't edit it.

## Shell

- zsh: quote globs, e.g. `grep -rn x --include='*.ts' server/src/geo`.
