---
name: ux-search-column-picker-and-peek-drawer
description: Design decision for surfacing additional asset fields in the Search page — column picker + peek drawer, section toggles rejected
metadata:
  type: project
---

When users need more fields visible in the Search page table (beyond the default 11 columns), the solution is:

1. **Peek drawer** — row click slides a right-side drawer (~480px) rendering `AssetDetails` content in condensed form. The list stays behind the drawer. "Open full page" link in drawer header goes to full detail page. URL gets `?barcode=X` (shareable, Back-button-safe). Keyboard: `j`/`k` to navigate rows in drawer, Escape to close. Barcode link in the table = full page navigation; row click = drawer.

2. **Column picker** — "Columns" button in the page header (right of Export) opens a popover (MultiSelectOptions style) with a flat checklist of optional columns, grouped by section label inside the popover. Persisted to `localStorage` key `search-column-prefs-v1`. "Reset to defaults" link at bottom of popover.

**Section toggles were rejected.** They conflate three distinct user needs (quick lookup, batch comparison, full record review), add cognitive overhead, and exist in no modern reference app (Linear, Airtable, GitHub Projects, Notion, Stripe).

**Row-expand accordion was rejected.** Breaks row-height uniformity, destroys sort/scan behavior, adds a third interaction model.

**Saved views deferred to v2.** Too much CRUD complexity for the current scope.

**Hold info popover still applies** (see [[ux-hold-info-in-search]]) — the hover popover on Status badge is the pattern for quick secondary context; the peek drawer is for full record review.

**Column picker column list** (requires `AssetSearchRow` backend extension for most optional columns):
- Always visible: Barcode, Brand/Model, Status, Readiness
- Specs (default on: Total Meter, Cassettes, Internal Finisher; off: B&W Meter, Colour Meter, Drum Life CMYK, Toner Life CMYK)
- Location (default on: Location; off: Warehouse)
- Hold (default off: Hold Number, Held By / Customer)
- Cost (default off: Purchase Cost, Sale Price, Total Cost)
- Transaction (default off: Arrival #, Departure #, Invoice #)
- Other (default on: Last Comment)

**Horizontal scroll rule:** Pin left 4 columns (select, barcode, brand, model) — already implemented. Cap text columns at 120px, numeric at 80px, comments at 200px. No compact mode toggle (adds second config axis). No sticky group band headers in table (complexity, no lasting benefit).

**Engineering flag:** Optional columns require extending `AssetSearchRow` schema to return cost/transaction/hold fields. At Loon's scale (hundreds–low thousands of assets) the extra payload is acceptable even when columns are hidden.

**Why:** Linear, Notion, Airtable, GitHub Projects, Retool all use this same combination — lean default table + per-column picker for batch comparison + row peek for full record. The detail page already exists and is well-built; the right investment is making it faster to reach (drawer), not duplicating its data into the table.

**How to apply:** Whenever a request to "add more columns" arrives for any list page, first ask whether the data is for (a) quick lookup → extend hover popover; (b) batch comparison → column picker; (c) full record → peek drawer. Only add default-on columns if the data is needed for scanning every row.
