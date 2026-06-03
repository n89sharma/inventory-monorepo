---
name: ux-profitability-page
description: Profitability page design for the Reporting section — table layout, filter pattern, margin visualization, drilldown, and deferred features
metadata:
  type: project
---

## Profitability page — design rationale (ratified 2026-06-03)

**Location:** Reporting → Profitability (`/reporting/profitability`)

**Table model:** Shopify Analytics-style. Fixed left column (Month label), fixed metric columns across (Assets, Base Cost, Total Cost, Sell Price, GM $ Base, GM % Base, GM $ Total, GM % Total). Sticky totals row at bottom. Months are rows. No drag-to-rearrange in v1.

**Margin columns:** Two-line cell — dollar value line 1, percentage line 2. Thin inline bar behind % value (width proportional to margin, max ~60%). Color: green above 30%, amber below 30%, red below 15%. Bar is low-opacity background div, not a separate column. No traffic-light badges on every cell.

**"Total assets" column:** Always visible as a column — do not hide in hover. Volume alongside margin is load-bearing for finance.

**Filters:** `MultiSelectOptionsInline` buttons in sticky header — Warehouse, Salesperson, Brand. Auto-fire on change (same as Linear/Inventory page pattern). Year selector (segmented control or dropdown) top-right beside Export CSV button.

**Export CSV:** Top-right of sticky header. DownloadSimpleIcon (consistent with search-page). Exports current filter state. Tooltip: "Export visible data as CSV." No dropdown of formats.

**Column sort:** Every column sortable by header click. "Sort by GM% Base" is the most valuable sort (worst/best month in one click). Required, not optional.

**Copy to clipboard:** "Copy table" button or right-click → tab-separated values for paste into email/Slack/Excel.

**Drilldown on row click:** Navigate to Search page with date filter pre-applied (first..last day of month) + active filters carried over. Back breadcrumb "← Profitability: Jan 2026" via sessionStorage (same pattern as Search → Asset Details). Do NOT open a modal — cannot show 50 assets comfortably.

**Assets count cell hover:** Popover showing status breakdown (In Stock: N, Sold: N). Fast read-only query, not a drilldown.

**Year-over-year:** Deferred. Build one-row-per-month table now. Future toggle "Compare to prior year" adds a muted second row per month. No blocker in the v1 table structure.

**Empty states:**
- Filters applied, no data: inline table message "No sales match these filters for [Year]. Try removing a filter." No illustration.
- No data at all (new account): centered card with link to Invoices page.
- Loading: skeleton rows, same height as data rows; headers render immediately.
- No permission (future): hide cost/margin columns, show lock icon in header; do not 403 the whole page.

**Open questions before backend work begins:**
1. What record defines a "sale" — Departure event type, invoice status, or something else?
2. What makes up "Total Cost" vs "Base Cost" — are extra costs tracked per-asset?
3. Is "Salesperson" the invoice creator or a dedicated field?
4. Should warehouse clerks see margin columns?
5. Time zone for month-boundary cutoff (UTC vs business local).

**Reference apps:** Shopify Analytics (table layout), Linear Insights (filter pill pattern), Metabase (row-level bar in cells), Vercel Analytics (row click → filtered detail page).
