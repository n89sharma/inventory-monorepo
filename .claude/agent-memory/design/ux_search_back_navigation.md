---
name: ux-search-back-navigation
description: Search → Asset Details → back to Search breadcrumb pattern — how state is captured, stored, and restored
metadata:
  type: project
---

## Decision: sessionStorage back-URL + hash-based scroll-to-row

Ratified pattern for the Search → Asset Details → breadcrumb-back loop.

### Filter state (URL params)
Filters already live in the URL at `/search?model=X&status=Y`. No new capture mechanism needed.

### Breadcrumb back-URL
Before navigating to `/search/:barcode`, write the current search URL + barcode hash to `sessionStorage` under the key `search-back-url`:  
e.g. `sessionStorage.setItem('search-back-url', '/search?model=5&status=3,7#BARCODE-001')`

Asset details page reads `sessionStorage.getItem('search-back-url')` on mount. If present, uses it for the "Search results" breadcrumb link. If absent (deep link / new tab), shows plain "Search" → `/search`.

**Why sessionStorage, not a URL param on the asset details page:** asset detail URLs (`/search/BARCODE`) must stay clean and shareable. Back-URL is a session artifact, not resource identity.

### Breadcrumb label + visual treatment
- With filter state: `← Search results` (ArrowLeftIcon Phosphor size 14 inline, links to stored back URL)
- Without filter state (deep link / new tab): `Search` (no arrow, links to `/search`)
- Convention reference: GitHub (plain list name), Stripe (← List Name with arrow on filtered return)

### Scroll-to-row on return
- Search page reads `window.location.hash` on mount (e.g. `#BARCODE-001`)
- After `assets` SWR data loads, finds matching row by barcode
- Calls `table.setPageIndex(pageIndexContainingRow)` then `scrollIntoView({ block: 'center', behavior: 'smooth' })`
- If row not found (deleted/filtered out): silently lands at page 1, top — correct degradation
- Cleans `sessionStorage` entry after use

### Selection state
Discarded on return. Not restored. Convention: GitHub, Linear, Stripe all discard selection on list→detail→list navigation. Stale selection risks accidental bulk edits.

### Pagination state
Restored implicitly via scroll-to-row (DataTable pages to the row). Not stored as a URL param — page index is too fragile when result set changes.

### Deep link / new tab degradation
Show "Search" → `/search`. No arrow. No "results" label. Same as GitHub's behavior for pasted issue URLs.

### sessionStorage key convention
`search-back-url` for search. If other collection flows (holds, transfers) adopt this pattern later, use `{section}-back-url` as the key convention.

### Engineering findings from codebase (2026-06-02)

**`DataTable` row click wiring** (`components/shadcn/data-table.tsx`, `DataRowImpl`):
- Row click calls `navigate(href)` for normal click; `window.open(href, '_blank')` for Cmd/Ctrl+click; `row.toggleSelected()` for Shift-click.
- `<TableRow>` has `data-state` but no `data-row-id`. Engineering must add `data-row-id={row.id}` to `DataRowImpl`'s `<TableRow>` for scroll targeting.
- `DataTable` internal pagination state (`pageIndex`) is owned by TanStack table internally and not exposed via ref or prop. Engineering must add a `focusRowId?: string` prop to `DataTable` that, after data loads, finds the matching row, calls `table.setPageIndex(pageContainingRow)`, then `scrollIntoView`.

**`sessionStorage` write point**: The write must happen inside `DataRowImpl`'s click handler (normal click path only, not Cmd/Ctrl — new-tab flow needs no back-url). `QueryPage` must pass the current search URL down to `DataTable` → `DataRow` so it can be written before `navigate(href)`. Alternatively `QueryPage` can listen to `useNavigate` and write to sessionStorage in a wrapper function passed as a `getRowHref` companion callback (cleaner — avoids prop drilling the full URL into DataTable).

**`getBreadcrumForAssetDetails`** (`components/custom/page-breadcrumb.tsx`, line 79):
- Currently returns `[{ label: 'Search', href: '/search' }]` for section === 'search'.
- Must be extended to accept an optional `backUrl` that, when present, replaces href and changes label to `← Search results` (or similar).
- `AssetDetailsPage` calls `getBreadcrumForAssetDetails(section, collectionId)` — it must read `sessionStorage.getItem('search-back-url')` and pass it through.

**`useAssetDetailsParams`** (`hooks/use-asset-detail-params.ts`):
- Route for search-sourced asset detail is `/search/:assetId` (section defaults to 'search', collectionId is null).
- No changes needed to this hook for the back-nav feature.

**sessionStorage write on re-search:** `QueryPage` re-renders on every filter change. The back-url write must happen only on row-click, not on filter change. The overwrite-on-click approach (every click overwrites) is correct — no special logic needed.

**Why `history.back()` was rejected:** semantically wrong for breadcrumbs (breadcrumbs are location, not history); breaks Cmd-click; breaks deep links; breaks if detail page pushed history entries; not right-click-copyable.
