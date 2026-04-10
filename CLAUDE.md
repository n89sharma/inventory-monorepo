# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Loon** is a lightweight inventory management system for small businesses to track assets in real-time. It is a TypeScript monorepo using npm workspaces with:
- `apps/backend` — Express.js REST API with Prisma + PostgreSQL
- `apps/frontend` — React 19 SPA with Vite
- `packages/shared-types` — Shared Zod schemas and TypeScript types

## Commands

All commands are run from within each app directory unless noted.

### Backend (`apps/backend`)
```bash
npm run dev      # tsx watch (hot reload)
npm run build    # tsc
npm run start    # node dist/src/index.js
npm run bs       # build then start
npm run prisma   # npx prisma generate --sql
```

### Frontend (`apps/frontend`)
```bash
npm run dev      # Vite dev server (port 5173)
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

No tests are configured yet.

### Root-level build commands
```bash
npm run bbuild   # Build backend only (from repo root)
npm run fbuild   # Build shared-types then frontend (from repo root)
```

## Development Workflow

**Before making any changes to project files, always load these two skills:**
1. `/vercel-react-best-practices`
2. `/vercel-composition-patterns`

### Guard Component Pattern
When the same conditional render shape — show children or show a fallback — appears more than once, extract it into a **Guard Component** rather than repeating inline ternaries. A Guard Component takes a `condition: boolean`, a `fallback: string` (or `ReactNode`), and `children: ReactNode`. It renders children when the condition is met, and the fallback otherwise.

This pattern mirrors how React's `Suspense` works and is the idiomatic alternative to repeating `{condition ? <content /> : <p>No data</p>}` across a page.

**Important JSX caveat:** children props are evaluated eagerly before the component renders. Use `?.` optional chaining inside children (not `!` non-null assertions) to avoid runtime errors when the guarded value is null.

Reference implementation: `apps/frontend/src/components/custom/asset-details/optional-section.tsx`

**Conditional rendering:** always use ternary over `&&` for conditional JSX (`condition ? <X /> : null`, not `condition && <X />`). The `&&` pattern can render `0` or `false` to the DOM unexpectedly. The Guard Component pattern handles the common repeated case.

**After every code change, run both build commands from the repo root:**
```bash
npm run bbuild
npm run fbuild
```
Then summarize any errors and fix them before considering the task complete.

## Architecture

### Data Flow
```
Frontend (React + Zustand + Axios)
  → Backend REST API (Express on port 3000)
  → Prisma ORM
  → PostgreSQL
```

### Shared Types Package
`packages/shared-types` contains Zod schemas used on **both** backend (validation) and frontend (form validation + type inference). Types are inferred from Zod schemas via `z.infer<>`. This is the single source of truth for entity shapes.

### Backend Structure (`apps/backend/src/`)
- `index.ts` — Express server setup, CORS, middleware registration
- `routes/` — Route definitions per entity
- `controllers/` — HTTP layer per entity (parse body, call service, return response)
- `services/` — Business logic per entity (Prisma calls, conflict checks, rules)
- `middleware/` — Request validation middleware (date range parsing currently; POST body validation middleware is a known technical debt — bodies are parsed inline in controllers for now)
- `prisma.ts` — Shared Prisma client instance

CORS allows `http://localhost:5173` (dev) and `https://shiva-inv.vercel.app` (prod). Backend uses ESM (`"type": "module"`, `moduleResolution: nodenext`).

### Frontend Structure (`apps/frontend/src/`)
- `data/api/` — Axios API clients, one file per entity
- `data/store/` — Zustand stores, one file per entity
- `components/pages/` — Summary (list) and Detail pages per entity
- `components/modals/` — Modal dialogs for create/edit actions
- `components/layout/` — MainLayout and navigation
- `components/shadcn/` — shadcn/ui components (do not edit these directly)
- `components/custom/` — Custom reusable UI components
- `hooks/` — Custom React hooks
- `lib/` — Utility functions

Path alias `@/` maps to `src/`.

### State Management Pattern
- **Global/server state:** Zustand stores per entity (`data/store/`)
- **Form state:** React Hook Form + Zod resolver (`@hookform/resolvers/zod`)
- **No React Query** — data fetching is done inside Zustand store actions

### UI Stack
- **TailwindCSS v4** via `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- **shadcn/ui** + **Radix UI** primitives for components
- **Phosphor Icons** for icons
- **TanStack React Table** for data tables

### Core Domain Entities
- **Asset** — core inventory item (barcode, model, status)
- **Arrival** — assets received from supplier
- **Departure** — assets sent to customer
- **Transfer** — assets moved between warehouses
- **Hold** — assets reserved for a customer
- **Invoice** — purchase/sales invoices
- **Organization** — suppliers, customers, transporters
- **Warehouse** — storage locations
- Reference data: Model, Brand, AssetType

### Prisma Notes
- Schema at `apps/backend/prisma/schema.prisma`
- Generated client output: `apps/backend/generated/prisma`
- Preview features: `relationJoins`, `typedSql`
- Config file: `apps/backend/prisma.config.ts`

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

There are two separate type systems in this project and they serve different purposes.

**Shared types** (`packages/shared-types/`) represent the **API contract** — the shape of data that crosses the network. They are used on both sides: backend uses them to validate request bodies and construct responses, frontend uses them to parse responses. These types contain only plain data — IDs, strings, numbers, dates. They have no knowledge of UI state.

**UI types** (`apps/frontend/src/ui-types/`) represent **form state** — the shape of data as managed by react-hook-form inside the browser. They are frontend-only and never shared with the backend.

Form types exist because **the shape of a form differs from the shape of an API payload** in two specific ways:

1. **Dropdowns hold rich objects, not IDs.** The API expects `created_for_id: number`, but the form must hold the full `SelectOption<User>` so the dropdown can display the user's name and track selection state. The mapping from form shape to payload shape happens in the API layer (`entity-api.ts`).

2. **Nullable fields need a UI-safe starting state.** A required field like `organization` starts as `null` in the form (unselected) before the user picks one. The shared type wouldn't model this — it expects a real value.

**When to add a type to each:**

| Add to `shared-types` | Add to `ui-types` |
|---|---|
| The shape crosses the network (request body, response body) | The shape only exists inside a form |
| Both backend and frontend need to know about it | It wraps a shared type for UI purposes (e.g. `SelectOption<User>`) |
| It represents what data *is* | It represents what a form *holds* |

In practice: every create/update form gets a `XyzFormSchema` + `XyzForm` type in `ui-types/`. The corresponding `CreateXyzSchema` + `CreateXyz` lives in `shared-types/`. The API layer file is the bridge that maps one to the other before sending the request.

---

### Backend Layers (`apps/backend/src/`)

| Layer | Path | Naming | Responsibility |
|---|---|---|---|
| **Database schema** | `prisma/schema.prisma` | Prisma models | Single source of truth for DB structure — all tables, relations, and field types defined here |
| **Typed SQL queries** | `prisma/sql/getSomething.sql` | camelCase, descriptive | Raw SQL for complex reads; run `npm run prisma` after any change to regenerate the typed client in `generated/prisma/sql/` |
| **Service** | `src/services/xyzService.ts` | `entityService.ts` | Pure DB logic — Prisma calls, conflict checks, business rules; no HTTP concerns |
| **Controller** | `src/controllers/xyzController.ts` | `entityController.ts` | HTTP layer — parse body with `XyzSchema.parse(req.body)`, call service, return 200/201/400/500 |
| **Route** | `src/routes/xyzRoutes.ts` | `entityRoutes.ts` | Wire URL paths to controller functions; registered in `src/index.ts` |

**Key backend utilities:**
- `response400`, `response500`, `successResponse` from `shared-types` — standard response wrappers
- `getNextSequence(entityType: string, warehouseCode: string, date: Date): Promise<number>` in `src/lib/db-utils.ts` — generates a sequential number for an entity on a given date; combine with date formatting to produce numbers like `H-260409-001`
- POST body validation: parse inline in the controller with `XyzSchema.parse(req.body)` — adding a shared `validateBody` middleware is a known technical debt

**Authentication:** Not yet implemented. Any field requiring a `created_by` / `updated_by` user ID defaults to hardcoded ID `178`.

---

### Frontend Layers (`apps/frontend/src/`)

| Layer | Path | Naming | Responsibility |
|---|---|---|---|
| **Form types** | `ui-types/entityFormTypes.ts` | `entityFormTypes.ts` | Zod schema + inferred TS type for react-hook-form; maps UI shape (e.g. `SelectOption<User>`) to what the form controls |
| **API** | `data/api/entity-api.ts` | `entity-api.ts` | Axios calls — maps form payload to request body, handles response parsing, uses `apiErrorHandler` in catch |
| **Store** | `data/store/entity-store.ts` | `entity-store.ts` | Zustand — owns list state, detail state, search filter state; exposes action methods that call the API layer |
| **Pages** | `components/pages/entity/` | `entity-form-page.tsx`, `create-entity-page.tsx`, `entity-details-page.tsx` | Form page holds all form UI and field wiring; create/update pages are thin wrappers that supply config and handle navigation |
| **Column definitions** | `components/pages/column-defs/` | `entity-columns.tsx` | TanStack column definitions for summary list tables and form asset tables; kept separate from page components to avoid clutter |
| **Components** | `components/custom/` | `descriptive-name.tsx` | Reusable UI not tied to a specific entity — `add-assets-to-create-form.tsx`, `collection-edit-bar.tsx`, `controlled-popover-search.tsx`, etc. |
| **Hooks** | `hooks/use-kebab-case.ts` | `use-kebab-case.ts` | Custom React hooks — see descriptions below |

**Form page anatomy** — all form pages follow this JSX structure:
```tsx
<FieldSet>
  <FieldLegend>Section Title</FieldLegend>
  <FieldGroup className='grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl'>

    {/* Dropdown backed by SelectOption<T> */}
    <Controller control={form.control} name='field'
      render={({ field: { onChange, value }, fieldState }) => (
        <SelectOptions selection={value} onSelectionChange={onChange} ... />
      )}
    />

    {/* Searchable org/entity picker — value is T | null */}
    <ControlledPopoverSearch control={form.control} name='org' options={orgs} ... />

    {/* Plain text input */}
    <Controller control={form.control} name='notes'
      render={({ field }) => <Textarea {...field} />}
    />

  </FieldGroup>
</FieldSet>

{/* Asset barcode scanner — outside FieldSet */}
<AddAssetByBarcode getAssets={...} onAddAsset={...} validateAsset={...} />

{/* Asset table — outside the form border */}
<DataTable columns={assetTableColumns} data={assets} />
```
- Form validation errors are surfaced via `toast.error(flattenFieldErrors(errors, []))` in the `onInvalid` handler passed to `form.handleSubmit`
- Asset field errors are shown inline using a `<Controller name='assets'>` that renders `<FieldError>` when `fieldState.invalid`

**Hooks:**
- `useGlobalData` — fetches users, organizations, models, and all reference data once at app start; called in `App.tsx`; results are available anywhere via their respective stores — no need to fetch these in a form or page
- `useAutoSearch` — triggers a search on page load if the entity has not been searched yet in the current session; used on every summary/list page to pre-populate results on first visit
- `useLocalStorage` — persists a value to `localStorage` with a versioned key; used for lightweight client-side preferences

**Global reference data** — loaded once via `useGlobalData`, available anywhere via stores with no extra fetch needed:
- `useUserStore` → active users
- `useOrgStore` → all organizations
- `useModelStore` → asset models
- `useConstantsStore` → warehouses, invoice types, asset types, statuses, roles

**`SelectOption<T>` pattern** — typed wrapper for dropdown state, defined in `ui-types/select-option-types.ts`:
- Three states: `SELECTED { selected: T }`, `UNSELECTED`, `ANY`
- `SelectOptions` component — for small, fixed lists (warehouses, users, invoice types)
- `ControlledPopoverSearch` — for large, searchable lists (organizations); stores value as `T | null` directly
- `getIdOrNullFromSelection()` extracts `.selected.id`; extend its union type when adding a new selectable entity type
- **Technical debt:** `SelectOptions` currently uses `anyAllowed` and `fieldRequired` boolean props to alter behavior. These should be replaced with explicit component variants or composition in a future refactor.

**Page routing** (`app.tsx`): specific routes must be declared before param routes:
```tsx
<Route path="/holds/new" element={<CreateHoldPage />} />    // ← before
<Route path="/holds/:collectionId" element={<HoldDetailsPage />} />
```

For any given feature, reading one file per layer for an existing entity gives you the complete pattern — roughly 8 files covers the full stack end to end.
