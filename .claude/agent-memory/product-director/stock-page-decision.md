---
name: stock-page-decision
description: Stock page MVP decision — warehouse-first browse is a separate page from model-first Search; aggregated counts + drill-down pattern
metadata:
  type: project
---

Stock page ("Stock") is a separate nav item from Search. Ratified: not a mode of Search.

**Why:** Different user (warehouse GM / ops vs sales rep), different starting question (where is my stuff vs do we have X), different default sort (zone/bin vs barcode desc). Mixing them degrades both use cases.

**How to apply:** Never suggest adding a "browse mode" or relaxing the model-required gate on the Search page. The warehouse browse lives in /stock.

**Shape (MVP):**
- Default view: aggregated summary table grouped by model + status with a count column
- Hard warehouse selector at top, single-select, defaults to user's assigned warehouse
- Status filter defaults to IN_STOCK + HELD only (ON_ORDER not physically present)
- Drill-down: click a (model, status) row → drawer/sheet showing flat asset list for that combo at that warehouse
- Summary columns: brand + model, asset type, status, readiness count, total count
- Drill-down columns: barcode, serial number, status, readiness, location (zone + bin), meter total
- Drill-down sort: zone A→Z then bin A→Z (physical walking order)
- Summary sort: model A→Z, then status (IN_STOCK → HELD → ON_ORDER)

**Client-side volume thresholds:**
- < 500 assets: client-side flat list fine, no virtualization needed
- 500–2k: add TanStack Virtual for row list
- 2k–5k: aggregated counts + paginated drill-down required
- 5k+: server-side pagination for flat list; counts remain aggregated query

**Competitive opening:** Asset Panda, Asset Tiger, Sortly have no aggregated stock summary — users export to Excel for counts. That is Loon's opening. Cin7/Fishbowl do it right but heavy onboarding. Loon surfaces this in primary nav, 0 clicks.

**Deferred:** Cross-warehouse comparison (v2+), export from Stock (v1.1), saved warehouse filter (v1.1), bin-level heatmap (Don't Build), age-in-warehouse metric (v2+).

[[competitive-landscape]]
[[asset-status-model]]
