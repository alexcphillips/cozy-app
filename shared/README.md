# @cozy/shared

Everything that **both** `ui` and `server` must agree on, and nothing else.

| Folder        | Holds                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| `contracts/`  | Request/response types and `API_PATHS` — the wire format of every endpoint.  |
| `validation/` | Rules enforced server-side and pre-checked client-side (passwords, emails).  |

## Rules

1. **No runtime dependencies.** Pure TypeScript that runs in a browser and in Node.
   Nothing here may import `express`, `pg`, `react`, or `zustand`.
2. **No business logic.** Shapes and pure predicates only. If it needs the database
   or the DOM, it belongs in `server` or `ui`.
3. **Contracts are the source of truth.** Change the contract first, then let the
   two typecheck failures tell you what to update on each side.
