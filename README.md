# cozy-app

An npm-workspaces monorepo: a React SPA, an Express + Postgres API, and the
typed contract they share.

```
ui/       React SPA (Vite)      -> localhost:5173
server/   Express API (tsx)     -> localhost:3000
shared/   @cozy/shared          -> types + validation used by both
```

**New here? Read [ARCHITECTURE.md](ARCHITECTURE.md).** It explains where code
goes and why, and lists the known gaps.

## Getting started

```bash
cp .env.example .env      # then fill in DB_PASSWORD and JWT_SECRET
npm install               # installs all three workspaces
npm run dev               # API + UI together
```

Postgres must be reachable at the `DB_*` values in `.env`. To run one in Docker:

```bash
docker compose -f server/docker-compose.yml up db
```

The schema is created on boot — `server/src/db/schema.ts` runs idempotent
`CREATE TABLE IF NOT EXISTS` statements, so there is no separate migrate step.

## Scripts

| Command              | Does                                          |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | API + Vite together                            |
| `npm run dev:ui`     | Vite only                                      |
| `npm run dev:server` | API only                                       |
| `npm run typecheck`  | `tsc` in each workspace                        |
| `npm run lint`       | eslint over the repo                           |
| `npm run build`      | server typecheck + production UI bundle        |
| `npm run verify`     | all of the above — run before you commit       |

## Creating a user

There is a registration screen at `/register`. To do it by hand instead, POST to
`/register` with `{ username, email, password }`.

## Authenticating a request by hand

1. POST `/login` with `{ email, password }`.
2. Copy the returned `token`.
3. Send it as `Authorization: Bearer <token>`.

The browser does this automatically — `ui/src/lib/api/apiFetch.ts` attaches the
token from the auth store to every request.
