---
name: ux-inventory-page
description: Design decision — Inventory page (warehouse stock view) is a separate page from Search, not a Search variant
metadata:
  type: project
---

Inventory page is a separate page from Search at `/inventory`, nav label "Inventory", sidebar above or near Search.

**Why:** Search is model-first (intentional lookup); Inventory is warehouse-first (ambient awareness of stock). Different users (warehouse staff vs ops/sales), different default state, different primary action. Merging them would break the 4-char gate UX, the empty state, the default sort, and the page title semantics.

**Ratified pattern:** Shopify Products vs Inventory split. Same underlying data, different default scope and entry point.

**How to apply:** Never suggest making model optional in Search as a way to serve warehouse staff — that conflates two distinct user jobs.

---

## Key design decisions

- **URL:** `/inventory`
- **Nav icon:** `CubesIcon` from Phosphor (WarehouseIcon already used by Arrivals)
- **Auto-fires on load** (no explicit Search button gate) — warehouse is pre-scoped, query is bounded
- **Default warehouse:** user's home warehouse if set, else first active warehouse alphabetically
- **Warehouse picker:** single `SelectOption`, not multi-select, visually prominent (first filter, heavier treatment than secondary filters)
- **Secondary filters:** Status (`MultiSelectOptionsInline`), Readiness (`MultiSelectOptionsInline`), Model (`ModelSearchInput`, no min-char gate)
- **No Meter Range / Cassettes / Internal Finisher in the header** — too ops-specific for floor view
- **Summary bar (row 3 of header):** "3,241 assets · In Stock: 1,840 · Held: 412 · In Transit: 89" — muted small text, updates as filters change
- **Default view:** flat list, sorted Model asc + Barcode desc. No grouping.
- **Default visible columns:** Barcode (pinned), Brand, Model, Status, Readiness, Location
- **Pagination:** 50 rows/page (vs Search's 25); no virtualization
- **Filters are URL params** (shareable URLs for free; no named saved views in v1)

## What to reuse from Search

- `DataTable` (unchanged)
- `ColumnPickerButton` + same `PICKABLE_COLUMNS` list
- `MultiSelectOptionsInline` for Status + Readiness
- `ModelSearchInput` (no gate)
- `StickyPageHeader` + `PageContent`
- `assetSearchColumns` column definitions (same `AssetSearchRow` type)
- Same backend endpoint (`getAssets.sql`) — model filter with `''` matches all; warehouse filter is `$4`; 4-char gate is frontend-only in Search

## What NOT to ship in v1

- Grouped view (by model or status)
- Named saved views
- Virtualization
- Multi-warehouse picker
- Cassettes / Meter / Internal Finisher header filters
- Separate backend endpoint

## Backend note

`getAssets.sql` line 62 uses `m."name" ~* $1`. Passing `''` for `$1` matches all models (empty regex). The 4-char gate is frontend-only in Search. The Inventory page can pass `''` for the model param and use the warehouse param (`$4`) for scoping. No backend changes required for v1. Verify the controller does not enforce the 4-char minimum server-side before starting frontend work.

See also: [[ux-search-minimum-criteria-gate]], [[ux-filter-bar-pattern]]
