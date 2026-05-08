# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Loon** is a lightweight inventory management system for small businesses to track assets in real-time. It is a TypeScript monorepo using npm workspaces with:
- `apps/backend` — Express.js REST API with Prisma + PostgreSQL
- `apps/frontend` — React 19 SPA with Vite
- `packages/shared-types` — Shared Zod schemas and TypeScript types

## Commands

Run from the **repo root** after every change:
```bash
npm run bbuild   # Build backend only
npm run fbuild   # Build shared-types then frontend
```

Per-app commands (run from within each app directory):
```bash
# Backend
npm run dev      # tsx watch (hot reload)
npm run prisma   # npx prisma generate --sql (run after any .sql file change)

# Frontend
npm run dev      # Vite dev server (port 5173)
```

No tests are configured yet.

## Development Workflow

**Before making any changes to frontend project files (apps/frontend/*), always load skill:**
1. `/vercel-react-best-practices`

**Before making a complicated refactor on a UI component in the frontend, load the skill:**
1. `/vercel-composition-patterns`

### Conditional Rendering Rules

**Binary condition (show or fallback):** Use a Guard Component (`condition: boolean`, `fallback: ReactNode`, `children: ReactNode`). Reference: `apps/frontend/src/components/custom/asset-details/optional-section.tsx`.
- Use `?.` optional chaining inside children (not `!`) — children props are evaluated eagerly before the component renders
- Always use ternary over `&&` for conditional JSX — `&&` can render `0` or `false` to the DOM

**Three or more states (e.g. loading / empty / content):** Extract a dedicated component and use early returns — never nest ternaries.

**After every code change, run `npm run bbuild && npm run fbuild` from the repo root. Summarize any errors and fix them before considering the task complete.**

---

## Code Style

**Line length:** Keep all lines under 100 characters (ruler at col 100). Wrap function signatures so each parameter is on its own line with the return type on a separate line. Wrap long object arguments (e.g. Prisma queries) when the single-line form exceeds 100 chars.

**Conditionals:** Prefer `if/else if` with early returns over ternary chains for range or multi-branch logic. Ternaries are acceptable for simple binary expressions only.

---

## Developer Guide

### The Stack

Every feature touches the same layers in both directions:

```
shared-types  (Zod schemas — single source of truth for entity shapes)
     ↓ ↑
backend       service → controller → route
     ↓ ↑
frontend      api → store → pages / components / hooks
```

Changes to a schema in `shared-types` propagate to both backend validation and frontend form validation. Always start there.

---

### Shared Types (`packages/shared-types/types/`)

- One file per entity: `hold-types.ts`, `invoice-types.ts`, `departure-types.ts`, etc.
- Types are inferred from Zod schemas via `z.infer<>` — no hand-written interfaces
- All exports flow through `index.ts` — always import from `'shared-types'`; this is an intentional package API boundary, not an intra-app barrel — do not refactor to deep imports
- Reference data types (statuses, warehouses, invoice types, roles, etc.) live in `reference-data-types.ts`

---

### Two Type Systems: Shared vs UI

**Shared types** (`packages/shared-types/`) are the API contract — plain data that crosses the network. **UI types** (`apps/frontend/src/ui-types/`) are form state only — dropdowns hold rich objects instead of IDs, and nullable fields start as `null` before the user picks a value. If the shape crosses the network → `shared-types`; if it only exists in a form → `ui-types`. Every create/update form gets a `XyzFormSchema` + `XyzForm` in `ui-types/`; the corresponding `CreateXyzSchema` + `CreateXyz` lives in `shared-types/`; the API layer file bridges them.

---

### Backend Layers (`apps/backend/src/`)

| Layer | Path | Naming | Responsibility |
|---|---|---|---|
| **Server setup** | `src/index.ts` | — | Express setup, CORS (`localhost:5173` dev, `shiva-inv.vercel.app` prod), middleware registration. Uses ESM (`"type": "module"`, `moduleResolution: nodenext`). |
| **Database schema** | `prisma/schema.prisma` | Prisma models | Single source of truth for DB structure — all tables, relations, and field types defined here |
| **Typed SQL queries** | `prisma/sql/getSomething.sql` | camelCase, descriptive | Raw SQL for complex reads; run `npm run prisma` after any change to regenerate `generated/prisma/sql/` |
| **Service** | `src/services/xyzService.ts` | `entityService.ts` | Pure DB logic — Prisma calls, conflict checks, business rules; no HTTP concerns |
| **Controller** | `src/controllers/xyzController.ts` | `entityController.ts` | HTTP layer — parse body with `XyzSchema.parse(req.body)`, call service, return 200/201/400/500 |
| **Route** | `src/routes/xyzRoutes.ts` | `entityRoutes.ts` | Wire URL paths to controller functions; registered in `src/index.ts` |

**Controller vs service separation:** Controllers own HTTP concerns only — parse query/body params, call a service, return the right status code. All DB logic (Prisma calls, raw SQL, business rules) belongs in the service. Never call `prisma` directly from a controller.

**Transactional pattern — TOCTOU rule:** Every service function that performs a conflict or uniqueness check before a write must use `prisma.$transaction(async (tx) => { ... })` (interactive/callback form) so the check and the write are atomic. Never use the array form `prisma.$transaction([...])` when conditional logic is involved — it cannot contain reads or early-returns between operations. The pattern is:
1. Reference-data lookups (statuses, warehouses) and sequence-number generation may happen **outside** the transaction — they are immutable or atomically generated.
2. All conflict checks, pre-reads used to compute diffs, and the writes themselves go **inside** the interactive transaction using `tx.*` instead of `prisma.*`.
3. Business-rule failures inside the tx throw `ConflictError` or `NotFoundError` (from `src/lib/errors.ts`); the outer `catch` maps these to `response400`, everything else to `response500`.
4. History/audit writes remain **outside** the transaction — they are best-effort and must not extend the transaction boundary.

**Error handling rules — services know nothing about HTTP:**
- Services return `T` directly on success and throw typed errors on failure. They never import or use `response400`, `response500`, `successResponse`, or `ApiResponse`. HTTP is the controller's concern.
- Typed errors (defined in `src/lib/errors.ts`): `NotFoundError` → 404, `ConflictError` → 409, `ValidationError` → 400 (cross-field business rules), `ZodError` → 400 (schema validation). All are caught by the global error handler in `src/lib/errorHandler.ts`.
- When adding a new failure mode: first check if an existing error class fits. Only add a new class to `errors.ts` and a new branch in `errorHandler.ts` if none of the existing types are semantically correct. Never set HTTP status codes inside a service.
- Controllers use `asyncHandler` (from `src/lib/asyncHandler.ts`) on every route handler — no explicit try/catch. Thrown errors propagate automatically to the global handler.
- Prisma P2002 (unique constraint violation) is handled globally → 400. Services should still throw `ConflictError` for application-level conflict checks (e.g. asset already on hold) so the message is meaningful.

**Query efficiency rules — no N+1 queries:**
1. **Never query inside a loop.** A `for` loop that calls `prisma.*` per iteration is always wrong unless the iteration count is guaranteed to be 1.
2. **Collect, then bulk-operate.** Gather all IDs or rows you need to create/delete during a loop, then execute one `createMany` / `deleteMany` after the loop.
3. **Resolve foreign keys once.** When the same FK needs to be resolved to a display name for N records (e.g. hold number from hold ID), resolve it once with a single query and reuse the result — never resolve inside a loop.
4. **Batch reads with `findMany` + `in`.** Fetch a set of related records in one query using `where: { id: { in: ids } }`, then build a `Map` for O(1) lookups.
5. **Acceptable exceptions (not N+1 bugs):** `updateMany` applies one `data` object to all rows — use individual `update` calls when each row differs. `createMany` cannot nest relation writes — use individual `create` when nested relations are required. `getNextSequence` must be called sequentially per record to guarantee monotonically increasing numbers.

**After removing a feature or query:** Delete any `.sql` files in `prisma/sql/` that are no longer used, then run `npm run prisma` to regenerate `generated/prisma/sql/`. Also check for orphaned imports across the controller, service, and API layers.

**Key backend utilities:**
- `response400`, `response500`, `successResponse` from `shared-types` — standard response wrappers
- `getNextSequence(entityType, warehouseCode, date)` in `src/lib/db-utils.ts` — generates a sequential number for an entity on a given date; combine with date formatting to produce numbers like `H-260409-001`
- POST body validation: parse inline in the controller with `XyzSchema.parse(req.body)` — adding a shared `validateBody` middleware is a known technical debt

**Logging:** Never use `console.log/error/warn` in the backend — import `logger` from `src/lib/logger.ts` instead. HTTP logging (Morgan) and Prisma query events are handled automatically; do not add manual logs in routes or services. Use `logger.error` for failures (include `requestId`), `logger.warn` for slow/recoverable issues, `logger.info` for lifecycle events, `logger.debug` for dev-only detail.

**Authentication:** Clerk is integrated end-to-end. `requireAuth` middleware resolves the Clerk JWT to a local DB user and stores the result in `res.locals.dbUserId`. All controllers pass `res.locals.dbUserId` to service functions for `created_by` / `updated_by` fields. No hardcoded user IDs anywhere in the codebase.

**Prisma:** Schema at `apps/backend/prisma/schema.prisma`. Generated client at `apps/backend/generated/prisma`. Config at `apps/backend/prisma.config.ts`. Preview features: `relationJoins`, `typedSql`.

**All SQL belongs in typed `.sql` files:** Never write inline SQL in service or controller files. Every query — simple or complex — goes in `prisma/sql/getSomething.sql` and is called via `prisma.$queryRawTyped(...)`. This keeps parameterization enforced by the Prisma type pipeline and prevents `Prisma.raw()` from being used as a workaround. Never use `$queryRaw`, `$queryRawUnsafe`, or `$executeRawUnsafe` anywhere in application code.

**Text search input safety:** Any controller field that feeds a SQL text-search or regex operator (e.g. `~*`, `LIKE`, `ILIKE`) must be validated with a Zod character allowlist before the query runs. Strip all POSIX regex metacharacters by constraining to safe characters only — e.g. `z.string().max(100).regex(/^[a-zA-Z0-9\s\-_.]*$/)`. Parameterization prevents SQL injection but does not prevent ReDoS: a bound parameter that contains `(a{1,50}){1,50}` is still evaluated as a regex by PostgreSQL's POSIX engine.

---

### Frontend Layers (`apps/frontend/src/`)

Path alias `@/` maps to `src/`.

| Layer | Path | Naming | Responsibility |
|---|---|---|---|
| **Form types** | `ui-types/entityFormTypes.ts` | `entityFormTypes.ts` | Zod schema + inferred TS type for react-hook-form; maps UI shape (e.g. `SelectOption<User>`) to what the form controls |
| **API** | `data/api/entity-api.ts` | `entity-api.ts` | Axios calls — maps form payload to request body, handles response parsing; `apiErrorHandler` in catch extracts the backend error message and calls `toast.error()` |
| **Store** | `data/store/entity-store.ts` | `entity-store.ts` | Zustand — owns list state, detail state, search filter state; exposes action methods that call the API layer. **The only layer components may call — never import from `data/api/` in a component, page, or modal.** |
| **Pages** | `components/pages/entity/` | `entity-form-page.tsx`, `create-entity-page.tsx`, `entity-details-page.tsx` | Form page holds all form UI and field wiring; create/update pages are thin wrappers that supply config and handle navigation |
| **Column definitions** | `components/pages/column-defs/` | `entity-columns.tsx` | TanStack column definitions for summary list tables and form asset tables; kept separate from page components to avoid clutter |
| **Components** | `components/custom/` | `descriptive-name.tsx` | Reusable UI not tied to a specific entity — `add-assets-to-create-form.tsx`, `collection-edit-bar.tsx`, `controlled-popover-search.tsx`, etc. |
| **Hooks** | `hooks/use-kebab-case.ts` | `use-kebab-case.ts` | Custom React hooks — see descriptions below |

**Store-first rule:** Components, pages, and modals must never import from `data/api/` directly. All data fetching and mutations go through a store action. The only legitimate exception is custom hooks that wrap `useSWR` (e.g. `use-hold-detail.ts`) — these exist specifically to integrate with SWR caching and live in `hooks/`.

**Toast position:** Always pass `{ position: 'top-center' }` to every `toast.error()`, `toast.success()`, and `toast.warning()` call — e.g. `toast.error('Something went wrong', { position: 'top-center' })`.

**Form page anatomy** — `FieldSet` + `FieldLegend` + `FieldGroup` wraps all fields; barcode scanner and asset table sit outside the `FieldSet`. Read any existing form page (e.g. `create-hold-page.tsx`) for the exact pattern.
- Form validation errors: `toast.error(flattenFieldErrors(errors, []))` in the `onInvalid` handler passed to `form.handleSubmit`
- Asset field errors: `<Controller name='assets'>` renders `<FieldError>` when `fieldState.invalid`

**Hooks:**
- `useGlobalData` — fetches users, orgs, models, and reference data once at app start (`App.tsx`); results available via `useUserStore`, `useOrgStore`, `useModelStore`, `useReferenceDataStore` — never re-fetch these in a form or page
- `useAutoSearch` — pre-populates list pages on first visit; used on every summary/list page
- `useLocalStorage` — persists a value to `localStorage` with a versioned key

**`SelectOption<T>` pattern** — typed wrapper for dropdown state, defined in `ui-types/select-option-types.ts`:
- Three states: `SELECTED { selected: T }`, `UNSELECTED`, `ANY`
- `SelectOptions` component — for small, fixed lists (warehouses, users, invoice types)
- `ControlledPopoverSearch` — for large, searchable lists (organizations); stores value as `T | null` directly
- `getIdOrNullFromSelection()` extracts `.selected.id`; extend its union type when adding a new selectable entity type

**`MultiSelectOptions` pattern** — for small fixed lists where multiple values can be selected simultaneously (e.g. availability statuses, technical statuses, warehouses on the Query page). Implemented as a `DropdownMenu` + `DropdownMenuCheckboxItem`. Keep the menu open on select via `onSelect={e => e.preventDefault()}`. Include a "Select all" item at the top. Component at `components/custom/multi-select-options.tsx`.

**Page routing** (`app.tsx`): specific routes must be declared before param routes:
```tsx
<Route path="/holds/new" element={<CreateHoldPage />} />    // ← before
<Route path="/holds/:collectionId" element={<HoldDetailsPage />} />
```

For any given feature, reading one file per layer for an existing entity gives you the complete pattern — roughly 8 files covers the full stack end to end.
