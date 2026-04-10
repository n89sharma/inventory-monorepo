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

**Before making any changes to project files, always load these two skills:**
1. `/vercel-react-best-practices`
2. `/vercel-composition-patterns`

### Guard Component Pattern
Extract repeated `condition ? <content /> : <fallback />` shapes into a Guard Component (`condition: boolean`, `fallback: ReactNode`, `children: ReactNode`). Reference: `apps/frontend/src/components/custom/asset-details/optional-section.tsx`.

- Use `?.` optional chaining inside children (not `!`) — children props are evaluated eagerly before the component renders
- Always use ternary over `&&` for conditional JSX — `&&` can render `0` or `false` to the DOM

**After every code change, run both build commands from the repo root:**
```bash
npm run bbuild
npm run fbuild
```
Summarize any errors and fix them before considering the task complete.

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

**Shared types** (`packages/shared-types/`) represent the **API contract** — plain data (IDs, strings, numbers, dates) that crosses the network. Used by both backend (request validation) and frontend (response parsing).

**UI types** (`apps/frontend/src/ui-types/`) represent **form state** — frontend-only, never sent to the backend. They differ from shared types in two ways:

1. **Dropdowns hold rich objects, not IDs.** The form holds `SelectOption<User>`; the API layer maps it to `created_for_id: number` before sending the request.
2. **Nullable fields need a UI-safe starting state.** A required field starts as `null` (unselected) in the form before the user picks a value.

Decision rule: if the shape crosses the network → `shared-types`; if it only exists in a form → `ui-types`.

In practice: every create/update form gets a `XyzFormSchema` + `XyzForm` type in `ui-types/`. The corresponding `CreateXyzSchema` + `CreateXyz` lives in `shared-types/`. The API layer file is the bridge that maps one to the other before sending the request.

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

**Key backend utilities:**
- `response400`, `response500`, `successResponse` from `shared-types` — standard response wrappers
- `getNextSequence(entityType, warehouseCode, date)` in `src/lib/db-utils.ts` — generates a sequential number for an entity on a given date; combine with date formatting to produce numbers like `H-260409-001`
- POST body validation: parse inline in the controller with `XyzSchema.parse(req.body)` — adding a shared `validateBody` middleware is a known technical debt

**Authentication:** Not yet implemented. Any field requiring a `created_by` / `updated_by` user ID defaults to hardcoded ID `178`.

**Prisma:** Schema at `apps/backend/prisma/schema.prisma`. Generated client at `apps/backend/generated/prisma`. Config at `apps/backend/prisma.config.ts`. Preview features: `relationJoins`, `typedSql`.

---

### Frontend Layers (`apps/frontend/src/`)

Path alias `@/` maps to `src/`.

| Layer | Path | Naming | Responsibility |
|---|---|---|---|
| **Form types** | `ui-types/entityFormTypes.ts` | `entityFormTypes.ts` | Zod schema + inferred TS type for react-hook-form; maps UI shape (e.g. `SelectOption<User>`) to what the form controls |
| **API** | `data/api/entity-api.ts` | `entity-api.ts` | Axios calls — maps form payload to request body, handles response parsing; `apiErrorHandler` in catch extracts the backend error message and calls `toast.error()` |
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
- `useGlobalData` — fetches users, organizations, models, and all reference data once at app start; called in `App.tsx`; results available anywhere via `useUserStore` (users), `useOrgStore` (orgs), `useModelStore` (models), `useConstantsStore` (warehouses, invoice types, asset types, statuses, roles) — no need to fetch these in a form or page
- `useAutoSearch` — triggers a search on page load if the entity has not been searched yet in the current session; used on every summary/list page to pre-populate results on first visit
- `useLocalStorage` — persists a value to `localStorage` with a versioned key; used for lightweight client-side preferences

**`SelectOption<T>` pattern** — typed wrapper for dropdown state, defined in `ui-types/select-option-types.ts`:
- Three states: `SELECTED { selected: T }`, `UNSELECTED`, `ANY`
- `SelectOptions` component — for small, fixed lists (warehouses, users, invoice types)
- `ControlledPopoverSearch` — for large, searchable lists (organizations); stores value as `T | null` directly
- `getIdOrNullFromSelection()` extracts `.selected.id`; extend its union type when adding a new selectable entity type

**Page routing** (`app.tsx`): specific routes must be declared before param routes:
```tsx
<Route path="/holds/new" element={<CreateHoldPage />} />    // ← before
<Route path="/holds/:collectionId" element={<HoldDetailsPage />} />
```

For any given feature, reading one file per layer for an existing entity gives you the complete pattern — roughly 8 files covers the full stack end to end.
