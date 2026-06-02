---
name: project-reporting-subsystem
description: Current state and planned architecture of the reporting/export subsystem in Loon
metadata:
  type: project
---

Today (2026-06-02) the export subsystem is entirely ad-hoc:

- One export endpoint exists: `POST /assets/export` in `assetController.ts` → `exportAssets` in `assetService.ts`
- Export is CSV-only, buffered in memory, returned as a raw string
- Headers are a `const CSV_HEADERS: string[]` array at line 288 of `assetService.ts` — no structural link to `AssetDetails` fields
- `generateCsv` at line 308 builds rows via a positionally-matched value array — column order is the only contract between headers and values; a reorder silently corrupts every report
- Hard cap of 2000 barcodes client-side; no streaming
- No per-report column selection; no report variants (arrival vs search vs query)
- Frontend export lives in `asset-store.ts` → `exportAssetsApi` in `asset-api.ts`; triggered from `search-page.tsx` via a download icon button
- `ReportsPage` is a stub ("Coming soon")
- No reporting service; all logic is inside `assetService.ts`

**Why:** Architectural audit requested by Nikhil to plan a proper reporting subsystem with column descriptors, report variants, user-selectable columns, and a dedicated service.

**How to apply:** When designing the reporting subsystem, the key risks are: (1) the positional array anti-pattern must be eliminated with a descriptor map, (2) streaming via Node.js Transform streams (piping to res) must be introduced for large exports, (3) column allowlisting server-side is a security requirement, (4) `fast-csv` or `papaparse` should replace the custom `escapeCSV` + string concatenation. See full audit/plan in architect conversation from 2026-06-02.
