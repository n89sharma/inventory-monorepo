# Frontend — `apps/frontend/`

React 19 SPA, Vite. Path alias `@/` → `src/`. Loads when you work in this tree.
Root `CLAUDE.md` rules still apply.

**Load the relevant skill first:**
- Editing any frontend file → `/vercel-react-best-practices`
- Complex refactor of a UI component → `/vercel-composition-patterns`

## Layers

| Layer | Path | Responsibility |
|---|---|---|
| Form types | `ui-types/entityFormTypes.ts` | Zod schema + inferred type for react-hook-form; UI shape (e.g. `SelectOption<User>`) |
| API | `data/api/entity-api.ts` | Axios calls; maps form payload ↔ request body. No SWR, no cache logic |
| Store | `data/store/entity-store.ts` | Zustand — **client state only** (filter selections, `hasSearched`, UI flags). ~30 lines |
| Query hooks | `hooks/use-entity.ts` | SWR reads: `useXDetail`, `preloadXDetail`, `xDetailKey`, `useXsList`, `invalidateXLists`. List key returns `null` until `fromDate` is set; `invalidateXLists()` is a matcher revalidating every cached filter variant |
| Mutation hooks | `hooks/use-entity-mutations.ts` | All writes for an entity (`create`, `addAsset`, `removeAsset`, `bulkRemoveAssets`, `updateMetadata`, `flushPending`…); returns a stable object. Imports keys/invalidators from `use-entity.ts` only — no cross-sibling imports |
| Pages | `components/pages/entity/` | Form page holds all field UI; create/details pages are thin wrappers (config + navigation) |
| Column defs | `components/pages/column-defs/entity-columns.tsx` | TanStack columns, kept out of page components |
| Components | `components/custom/descriptive-name.tsx` | Reusable UI not tied to one entity |
| Hooks | `hooks/use-kebab-case.ts` | Custom hooks (see below) |
| Lib | `lib/*.ts` | Pure utils / cross-cutting helpers |

Reading one file per layer for an existing entity (~9 files: form types, API, store, query hook,
mutations hook, form page, create page, details page, columns) gives the full end-to-end pattern.

## Server vs client state — strict separation

The reason Zustand is **not** a data layer here: copying server data into Zustand creates two
sources of truth. Don't do it.
- **Server state → SWR.** Anything from the network is owned by an SWR hook; cache keys colocated
  with the hook.
- **Client state → Zustand.** Filter selections, UI toggles, `hasSearched`. Stores never call
  APIs and never call `mutate()`.
- **Components never import `data/api/*` directly.** Allowed entry points: a Zustand store
  (client state), a `useEntityDetail` / `useEntitiesList` hook (reads), or a `useEntityMutations`
  hook (writes).
- **Every mutation invalidates the caches it affects** — typically `mutate(entityDetailKey(id))`
  + `invalidateEntityLists()`. Optimistic: `mutate(key, updater, { revalidate: false })` then a
  final `mutate(key)` in `finally`.

## API layer parsing & typing

Every `*-api.ts` function must (1) build outgoing bodies with
`const fnBody = Schema.parse({...} satisfies Type)` — `satisfies` for compile-time field
enforcement, `.parse()` for runtime validation; and (2) parse every response with
`Schema.parse(data.data)` before returning. No bare `return data.data`, no inline object literals
passed to `api.post`/`put`. No schema yet? Add one to `shared-types` (or a local `z.object({...})`
for endpoint-specific wrappers like `{ id: number }`).

## Types: shared vs UI

If a shape crosses the network → `shared-types` (`CreateXyzSchema` + `CreateXyz`). If it only
exists in a form → `ui-types` (`XyzFormSchema` + `XyzForm`; dropdowns hold rich objects not IDs,
nullable fields start `null`). The `*-api.ts` file bridges them.

## JSX conditionals

- **Binary (show or fallback):** use a Guard component (`condition`, `fallback`, `children`).
  Ref: `components/custom/asset-details/optional-section.tsx`. Use `?.` inside children (not `!`)
  — children are evaluated eagerly. Use a ternary, never `&&` (which can render `0`/`false`).
- **Three+ states (loading / empty / content):** extract a dedicated component with early
  returns — never nest ternaries.

## Patterns

- **Toasts:** always pass `{ position: 'top-center' }` to every `toast.error/success/warning`.
- **Form page anatomy:** `FieldSet` + `FieldLegend` + `FieldGroup` wraps all fields; barcode
  scanner and asset table sit outside the `FieldSet`. Read an existing page (e.g.
  `create-hold-page.tsx`) for the exact shape. Validation errors:
  `toast.error(flattenFieldErrors(errors, []))` in `onInvalid`. Asset errors: `<Controller
  name='assets'>` renders `<FieldError>` when `fieldState.invalid`.
- **Routing (`app.tsx`):** specific routes before param routes — `/holds/new` before
  `/holds/:collectionId`.
- **`SelectOption<T>`** (`ui-types/select-option-types.ts`): states `SELECTED { selected: T }` /
  `UNSELECTED` / `ANY`. `SelectOptions` for small fixed lists; `ControlledPopoverSearch` for
  large searchable lists (stores `T | null`). `getIdOrNullFromSelection()` extracts `.selected.id`
  — extend its union when adding a selectable type.
- **`MultiSelectOptions`** (`components/custom/multi-select-options.tsx`): small fixed lists,
  multiple selections. `DropdownMenu` + `DropdownMenuCheckboxItem`; keep open on select with
  `onSelect={e => e.preventDefault()}`; include "Select all" at top.
- **Asset removal undo** (`lib/asset-removal-undo.ts`), shared across all 5 collection entities:
  `scheduleAssetRemoval`, `scheduleBulkAssetRemoval`, `flushPendingRemovals`. Owns a module-level
  `Map` so the 5s timer survives re-renders. Detail pages call `mutations.flushPending(id)` in
  their unmount effect.
- **Global data:** `useGlobalData` fetches users, orgs, models, reference data once in `App.tsx`
  → available via `useUserStore` / `useOrgStore` / `useModelStore` / `useReferenceDataStore`.
  Never re-fetch these in a form or page. `useAutoSearch` pre-populates list pages on first visit.
- **Page state lives in the URL** (`lib/search-*-params.ts` pattern: `filtersToParams` /
  `paramsToFilters`) so views are shareable and survive back-navigation. Local `useState` only
  for transient state (typeahead text) — state the deviation explicitly.
