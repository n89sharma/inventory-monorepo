---
name: ux-filter-bar-pattern
description: Ratified filter bar pattern for collection/summary pages — sticky header, inline horizontal, Quick Search buttons inline
metadata:
  type: project
---

Collection pages (Departures, Holds, Transfers, Invoices, Arrivals) are being consolidated from Pattern B (bordered SearchBar box, non-sticky, two-row layout) to Pattern A (StickyPageHeader, inline horizontal flex-wrap, matching Search page).

**Ratified decisions:**
- Filters live in `StickyPageHeader` — never scroll away with the table data
- No outer border/box wrapper on the filter row — the border communicates nothing
- Quick Search preset buttons (7d / 30d / 60d) sit inline to the left of From Date as a segmented cluster
- Quick Search buttons auto-fire on click (no separate Search button needed for presets)
- Manual Search button is retained for date + dropdown combination — don't auto-search on input change
- "Quick Search" FieldLabel is removed — the buttons are self-labeling
- Button labels shortened: "7d / 30d / 60d" not "7 Days / 30 Days / 60 Days"
- `CollectionPage` component should own the `StickyPageHeader` wrapping internally, not consumers

**Open product question:** Quick Search buttons currently reset all dropdowns to ANY_OPTION. Should they preserve the warehouse/other selections? Needs product decision before implementation.

**Convention reference:** Linear (persistent sticky filter bar), Stripe dashboard (date range always visible), GitHub (inline preset range buttons that fire immediately).

**Related:** [[ux-search-page-pattern]]
