# Backend — `apps/backend/`

Express REST API, Prisma + PostgreSQL, ESM (`"type": "module"`, `moduleResolution: nodenext`).
Loads when you work in this tree. Root `CLAUDE.md` rules still apply.

## Layers

| Layer        | Path                               | Responsibility                                                                                                                                                    |
| ------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server setup | `src/index.ts`                     | Express, CORS (`localhost:5173` dev, `shiva-inv.vercel.app` prod — confirm this domain is current), middleware, route registration                                |
| DB schema    | `prisma/schema.prisma`             | Single source of truth for tables, relations, field types. Generated client: `generated/prisma`. Config: `prisma.config.ts`. Preview: `relationJoins`, `typedSql` |
| Typed SQL    | `prisma/sql/getSomething.sql`      | Raw SQL for reads, camelCase names; run `npm run pgen` after any change                                                                                           |
| Service      | `src/services/xyzService.ts`       | Pure DB logic — Prisma, conflict checks, business rules. No HTTP                                                                                                  |
| Controller   | `src/controllers/xyzController.ts` | HTTP only — parse `req.body` with `XyzSchema.parse(...)`, call service, return status                                                                             |
| Route        | `src/routes/xyzRoutes.ts`          | Wire paths to controllers; register in `src/index.ts`                                                                                                             |

**Controller vs service:** controllers own HTTP only (parse params, call a service, set status).
All DB logic lives in the service. Never call `prisma` directly from a controller.

## Transactions — TOCTOU rule

Any service that does a conflict/uniqueness check before a write must use the **interactive**
form `prisma.$transaction(async (tx) => {...})` so check and write are atomic. Never use the
array form when conditional logic is involved.

- Reference-data lookups (statuses, warehouses) and sequence-number generation may run **outside**
  the tx — immutable or atomically generated.
- All conflict checks, diff pre-reads, and writes go **inside**, using `tx.*`.
- Business-rule failures throw `ConflictError` / `NotFoundError` (`src/lib/errors.ts`).
- History/audit writes stay **outside** — best-effort, must not extend the tx boundary.

## Errors — services know nothing about HTTP

- Services return `T` on success, throw typed errors on failure. They never touch `response400`,
  `response500`, `successResponse`, or set status codes.
- Typed errors (`src/lib/errors.ts`): `NotFoundError`→404, `ConflictError`→409,
  `ValidationError`→400 (cross-field rules), `ZodError`→400 (schema). Caught globally in
  `src/lib/errorHandler.ts`. Prisma P2002 → 400 globally (still throw `ConflictError` in the
  service for a meaningful message).
- New failure mode: reuse an existing error class if it fits; only add a class + handler branch
  when none is semantically correct.
- Controllers wrap every handler in `asyncHandler` (`src/lib/asyncHandler.ts`) — no try/catch;
  thrown errors propagate automatically.

## Query efficiency — no N+1

1. Never call `prisma.*` inside a loop (unless iteration count is guaranteed 1).
2. Collect during the loop, then one `createMany` / `deleteMany` after.
3. Resolve a shared FK→name once with a single query; reuse — never resolve in a loop.
4. Batch reads with `findMany` + `where: { id: { in: ids } }`, then a `Map` for O(1) lookups.
5. Not N+1 bugs: `update` per row when each row's `data` differs; `create` per row when nested
   relation writes are needed; `getNextSequence` called sequentially for monotonic numbers.

## SQL

- **All SQL lives in typed `.sql` files** called via `prisma.$queryRawTyped(...)` — even simple
  queries. Never inline SQL in services/controllers. Never use `$queryRaw`, `$queryRawUnsafe`,
  `$executeRawUnsafe`, or `Prisma.raw()`.
- **Text-search input safety:** any field feeding `~*`, `LIKE`, `ILIKE` must pass a Zod allowlist
  before the query, e.g. `z.string().max(100).regex(/^[a-zA-Z0-9\s\-_.]*$/)`. Parameterization
  stops SQL injection but not ReDoS — a bound param like `(a{1,50}){1,50}` is still run as a
  POSIX regex by Postgres.
- After removing a feature/query: delete unused `.sql` files, run `npm run pgen`, and check for
  orphaned imports across controller, service, and API layers.

## Conventions

- **Logging:** never `console.*`; import `logger` from `src/lib/logger.ts`. Morgan HTTP logs and
  Prisma query events are automatic — don't add manual logs in routes/services. `logger.error`
  (failures, include `requestId`), `.warn` (slow/recoverable), `.info` (lifecycle), `.debug` (dev).
- **Auth:** Clerk end-to-end. `requireAuth` resolves the JWT to a local user in
  `res.locals.dbUserId`; controllers pass it to services for `created_by` / `updated_by`. No
  hardcoded user IDs.
- **Utilities:** `response400` / `response500` / `successResponse` from `shared-types`;
  `getNextSequence(entityType, warehouseCode, date)` in `src/lib/db-utils.ts` produces numbers
  like `H-260409-001`.
- POST validation is parsed inline in the controller (`XyzSchema.parse(req.body)`); a shared
  `validateBody` middleware is known tech debt.
