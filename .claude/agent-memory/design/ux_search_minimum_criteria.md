---
name: ux-search-minimum-criteria
description: Design decisions for the Search page minimum-criteria gate — how the UI communicates required narrowing before a query fires
metadata:
  type: project
---

The Search page must require minimum criteria before firing (currently: model required; new rule: model OR (warehouse + status narrowed)). The PO's concern: the compound rule is invisible and confusing.

**Ratified approach:** Explicit Search button + guided empty state. Do NOT auto-fire on filter change. Remove debounce-to-URL pattern in favor of explicit commit. Keeps warehouse staff in control and avoids intermediate queries on partial criteria.

**Empty state before criteria met:** Three-line centered message in the results area. Primary line: "Select filters to search." Secondary line states the minimum rule plainly. No illustration. CTA: the Search button in the header (no duplicate button in the empty state).

**Search button behavior:**
- Enabled when criteria are met (model selected, OR warehouse selected AND at least one non-Sold/Scrapped status selected)
- Disabled with tooltip when criteria are not met — tooltip states the rule in plain language
- Spinner replaces icon during load (existing SpinnerGapIcon pattern)
- Button lives in the header row next to Export

**Result cap banner:** When results hit the server-side cap (e.g. 200), show an inline muted text line directly above the table: "Showing first 200 results — narrow your search to see more." Not a toast, not a modal. Dismissible is unnecessary — it's contextual.

**Keyboard:** Enter in any filter field submits (calls the same commit handler). Tab order: filters left-to-right, then Search button, then Export.

**Rejected alternatives:**
- Auto-fire with compound gate: rule stays invisible, partial criteria fire intermediate queries
- Required-field asterisk on Model alone: doesn't communicate the OR path
- Inline field hints (yellow border, warning icon): adds visual noise for the common case where user knows what they want
- Disabled Search button without tooltip: silent failure, violates PO's legibility requirement

**Convention reference:** Datadog log search (explicit Search/Run button, greyed until index is narrowed), airline search (Search button, never auto-fires), GitHub advanced search (explicit submit).

**Related:** [[ux-filter-bar-pattern]], [[ux-meter-range-filter]]
