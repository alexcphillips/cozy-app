# Architecture

How this repo is laid out, and why. Read this once before your first change.

The layout optimises for one thing: **you should be able to guess where a file
lives before you look.** That matters for people onboarding, and it matters even
more for AI agents, which cannot browse casually and pay for every wrong guess.

---

## 1. The shape

```
cozy-app/
├── ui/                 React SPA (Vite)          -> the browser
├── server/             Express API (tsx)          -> the box
├── shared/             @cozy/shared               -> the contract between them
├── tsconfig.base.json  strictness, set once
├── eslint.config.js    one config, scoped per workspace
└── package.json        npm workspaces + the scripts you actually run
```

Three npm workspaces. `ui` and `server` never import each other; both import
`shared`. That single rule is what keeps the dependency graph a triangle rather
than a web.

```
        shared
        /    \
      ui  ✗  server        (ui <-> server is not a legal edge)
```

### Commands

| Command              | Does                                             |
| -------------------- | ------------------------------------------------ |
| `npm install`        | installs all three workspaces                    |
| `npm run dev`        | API + Vite together                              |
| `npm run dev:ui`     | Vite only (port 5173)                            |
| `npm run dev:server` | API only (port 3000)                             |
| `npm run typecheck`  | `tsc` in each workspace                          |
| `npm run lint`       | eslint over the repo                             |
| `npm run build`      | server typecheck + `vite build`                  |
| `npm run verify`     | all three, in order — run this before you commit |

---

## 2. `shared/` — the contract

Everything both sides must agree on, and nothing else.

```
shared/src/
├── contracts/
│   ├── api.paths.ts        API_PATHS + buildPath()   <- every URL, declared once
│   ├── auth.contract.ts
│   ├── books.contract.ts
│   ├── diet.contract.ts
│   └── user.contract.ts
└── validation/
    ├── credentials.ts      validateEmail / validatePassword / validateUsername
    └── validation.constants.ts
```

**Why this exists.** Before the refactor, the password rule was written twice:
the client accepted anything `>= 8` characters, the server required `8..32`.
A 40-character password passed client validation and was rejected by the
server with a message the client never showed. Two files, one rule, one silent
divergence. Now there is one `validatePassword`, imported by both.

The same argument applies to URLs. `API_PATHS.diet.foodLog` is the string the
Express router registers _and_ the string the React API client calls. Renaming
an endpoint is one edit, and TypeScript finds every caller.

**Rules for `shared/`:**

1. No runtime dependencies. It must run in a browser and in Node — nothing here
   may import `express`, `pg`, `react`, or `zustand`.
2. Types and pure functions only. If it needs the database or the DOM, it
   belongs in `server` or `ui`.
3. Change the contract first. The two typecheck failures that follow are your
   to-do list.

---

## 3. `server/` — modules own their data

```
server/src/
├── index.ts            boot: ensureSchema() then listen()
├── app.ts              express wiring only — no endpoints
├── routes.ts           THE route manifest: every module mounted, once
├── config/
│   ├── env.ts          every process.env read, validated at import
│   └── constants.ts    server-only constants
├── db/
│   ├── pool.ts         query() / execute() — the only way to reach Postgres
│   └── schema.ts       idempotent CREATE TABLE IF NOT EXISTS
├── http/
│   ├── AppError.ts     the one way to reject a request
│   └── asyncHandler.ts rejected promises reach the error middleware
├── middleware/         auth, requestLogger, errorHandler
├── lib/                jwt, crypto, string similarity
└── modules/
    ├── users/
    ├── diet/
    ├── books/
    └── game/           engine/models/systems — not yet mounted
```

### The four-file module

Every module is the same four files, in the same order of abstraction:

```
modules/diet/
├── diet.routes.ts       path + guard + handler.        "what URLs exist"
├── diet.controller.ts   HTTP in, HTTP out, validation.  "what the rules are"
├── diet.repository.ts   rows -> contract types.         "what the data means"
├── diet.sql.ts          the SQL.                        "what runs on the db"
└── diet.types.ts        row types, snake_case as pg returns them
```

Read them top to bottom and you have the whole feature. This is the
"localized context" property: an agent asked to change how food logs are
deleted opens one directory and finds the route, the validation, the query, and
the types side by side — no jumping between `routes/`, `controllers/`,
`services/`, and `models/` trees that each hold one-quarter of the answer.

**Layer rules, in one line each:**

- `*.routes.ts` — declares the path and the guard. No logic.
- `*.controller.ts` — parses input, throws `AppError`, returns contract types.
  Never writes SQL, never touches `pg`.
- `*.repository.ts` — the only place SQL is executed. Maps DB rows to
  `@cozy/shared` types, so `password_hash` cannot leak by accident.
- `*.sql.ts` — statements as named constants. Values always go through `$1`
  params; string interpolation into SQL is how injection gets in.

### Errors

Controllers do not build error responses. They `throw AppError.badRequest(...)`
and the central `errorHandler` turns it into `{ error: message }` with the right
status. Anything that is _not_ an `AppError` is treated as a bug: logged in
full, returned as a bare 500, so SQL text and stack traces never reach a client.
This replaced ~15 hand-written `res.status(500).send("Db error")` blocks that
each formatted errors slightly differently.

### `routes.ts` is the map

Adding an endpoint is three edits, and the manifest tells you where:

1. `modules/<name>/` — the four files.
2. `shared/contracts/api.paths.ts` — the path.
3. `server/src/routes.ts` — one `apiRouter.use(...)` line.

---

## 4. `ui/` — features own their screens

```
ui/src/
├── main.tsx
├── app/
│   ├── App.tsx           providers only
│   ├── routes.tsx        THE route manifest — every screen, once
│   ├── routes.paths.ts   ROUTES — every client URL, once
│   └── ProtectedRoute.tsx
├── features/             <- almost all the code lives here
│   ├── auth/     api/ components/ pages/ stores/
│   ├── diet/     api/ components/ hooks/ pages/
│   ├── library/  api/ pages/
│   ├── home/     pages/ + home.items.ts, home.filters.ts
│   ├── profile/  components/ pages/
│   ├── docs/     pages/            (component gallery)
│   └── game/     actions/ components/ hooks/ pages/ stores/ styles/
├── components/           shared presentational only: Table, Drawer, Filters...
├── layouts/              AppLayout, Navbar, SideNav
├── lib/api/              apiFetch (transport) + api (typed JSON) + ApiError
├── hooks/                genuinely cross-feature hooks
└── utils/                pure helpers
```

### Feature-first, not type-first

The old tree grouped by _what a file is_: `pages/`, `components/ui/`, `hooks/`,
`store/`, `config/`. Working on the food log meant touching
`pages/cozyCare/`, `components/ui/WeightInputForm/`, `hooks/useWeightData.ts`,
and `config/` — four directories, none of which mention "diet". Deleting the
feature meant hunting for its parts.

Now it groups by _what a file is for_. `features/diet/` holds the pages, the
components only it uses, its hook, and its API client. Deleting the feature is
`rm -rf` on one directory plus one line in `routes.tsx`.

### What earns a place in `components/`

Only components with no feature knowledge: `Table`, `Drawer`, `Filters`,
`LinkCard`, `TextInputWithSmallSelect`. If it mentions a domain noun — a food
item, a weight entry, a login — it belongs to that feature.

`LoginForm` and `WeightProgressCard` used to sit in `components/ui/` beside
`Table`. They moved into `features/auth/` and `features/diet/` respectively;
`Table` stayed. The test is simply whether a second feature could use it
unchanged.

### The API layer

Three levels, each with one job:

```
lib/api/apiFetch.ts   transport: base URL + bearer token -> raw Response
lib/api/client.ts     api.get/post/delete<T>: JSON in, typed T out, throws ApiError
features/*/api/*.api.ts  named, typed methods for one feature's endpoints
```

Components call the feature API, never `fetch` and never `apiFetch`:

```ts
// before — in a component, repeated at every call site
const response = await apiFetch("/food-log?date=" + encodeURIComponent(today));
if (!response.ok) {
    setError("Error fetching food log");
    return;
}
const result = await response.json(); // : any

// after
const entries = await dietApi.listFoodLog(today); // : FoodLogEntry[]
```

The response type is no longer `any`, the URL comes from `API_PATHS`, and error
handling is one `catch` instead of an `.ok` check at every call site.

`apiFetch` remains exported for the one legitimate case: `FileUpload`, which
needs the raw `Response` and sends `FormData`.

### `routes.tsx` is the map

Same shape as the server's: every screen listed once, public routes above the
`<ProtectedRoute>` boundary, everything else below it. `routes.paths.ts` holds
the URLs so `navigate(ROUTES.login)` survives a rename.

---

## 5. Type safety, end to end

`tsconfig.base.json` sets the rules once and every workspace inherits them:

- `strict`
- `noUncheckedIndexedAccess` — `array[0]` is `T | undefined`, because it is
- `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`

Do not relax these per package. They found real bugs during this refactor (see
§7).

The chain that makes a response type trustworthy:

```
Postgres row        diet.types.ts     FoodLogEntryRow
   -> repository    maps to           @cozy/shared FoodLogEntry
   -> controller    res.json(...)     FoodLogEntry[]
   -> dietApi       api.get<FoodLogEntry[]>
   -> component     data: FoodLogEntry[]
```

Change the SQL to drop a column and the row type stops matching the contract at
compile time, on the server, before the UI ever sees it.

One subtlety worth knowing: **`pg` returns `NUMERIC` as a string.** Every
calorie and weight value used to arrive in the browser as `"12.50"`, which is
why the old totals code was full of `typeof x === "string" ? parseFloat(x) : x`.
`db/pool.ts` now installs a type parser once, so `NUMERIC` is a `number`
everywhere and the contract's `calories: number` is honest.

---

## 6. Conventions

**Naming.** `feature.role.ts` — `diet.controller.ts`, `auth.store.ts`,
`books.api.ts`. The role is in the filename, so a grep for `*.repository.ts`
finds every database boundary in the repo.

**Where does X go?**

| You are adding...            | It goes in                                        |
| ---------------------------- | ------------------------------------------------- |
| an API endpoint              | `server/src/modules/<feature>/` + `routes.ts`     |
| a request/response type      | `shared/src/contracts/`                           |
| a validation rule both use   | `shared/src/validation/`                          |
| a page                       | `ui/src/features/<feature>/pages/` + `routes.tsx` |
| a component one feature uses | `ui/src/features/<feature>/components/`           |
| a component two features use | `ui/src/components/`                              |
| a call to a new endpoint     | `ui/src/features/<feature>/api/`                  |
| an env var                   | `server/src/config/env.ts` + `.env.example`       |

**Anchors.** Four files are the entry points for navigation, and each says so
in its own header comment:

- `server/src/routes.ts` — what endpoints exist
- `ui/src/app/routes.tsx` — what screens exist
- `shared/src/contracts/api.paths.ts` — what URLs exist
- `server/src/config/env.ts` — what configuration exists

---

## 7. What changed, and what it fixed

The restructure surfaced these. All are fixed:

| Issue                                         | Was                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Password rules diverged                       | client `>= 8`, server `8..32`; long passwords failed server-side with an unshown message                |
| `nextPageExists` vs `doesNextPageExist`       | the server sent one name, `Library.tsx` read the other — so "next page" was permanently `false`         |
| Books search cost 2x                          | every search fetched the next page too, just to test whether it existed; now derived from `totalItems`  |
| `Content-Type: application/json` on uploads   | `apiFetch` forced it even for `FormData`, breaking the multipart boundary                               |
| `setWeightEntries([...newEntry, ...current])` | spread the returned object as if it were an array — a `TypeError` on every successful weight submission |
| `DietTracker` duplicated `useWeightData`      | two implementations of the same fetch/derive logic; the page now uses the hook                          |
| `/diet-tracker` was unreachable               | login redirected there but no route was declared, so it silently bounced home                           |
| Library search race                           | a slow early request could overwrite a newer result; the effect now cancels                             |
| Errors leaked internals                       | `res.status(500).send(err.message)` returned raw SQL text in production                                 |
| `HUDLayer.tsx` (game/ui)                      | fully commented out, duplicating the live `components/HUDLayer` — deleted                               |

Structural moves: 247 files relocated with `git mv` (history preserved), server
routes split into 4-file modules, `src/` → `ui/src/`, `config/` dissolved into
its owning features.

---

## 8. Known gaps

Deliberately left alone, so you are not surprised:

- **No tests.** There is no test runner in the repo. The four-file module shape
  makes repositories and controllers straightforward to test in isolation —
  that is the natural next step.
- **`schema.ts` is not a migration runner.** Additive `CREATE TABLE IF NOT
EXISTS` only. Introduce real migrations before the first destructive change.
- **Placeholder files.** Roughly 30 empty `.ts`/`.tsx` files exist as
  scaffolding, mostly under `features/game/components/ZoneButtons/` and
  `modules/game/`. They were preserved and renamed to match their directories
  (`FIremakingZoneButton` → `FiremakingZoneButton`, and so on).
- **`modules/game/` is not mounted.** The browser runs the game today; the
  server-side engine is in progress. `game.routes.ts` explains this in place.
- **`eng.traineddata`** sits at the root, gitignored, unreferenced — the
  `tesseract.js` dependency has no call site yet.
- **`features/docs/`** is a component gallery, not product. Three of its four
  table examples are empty files.
