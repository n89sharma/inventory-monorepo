---
name: ux-asset-status-fields
description: Design decisions for Loon's two asset status dimensions — ownership vs location, visual hierarchy, filtering pattern, and label terminology
metadata:
  type: project
---

Two status fields is the correct model — neither dimension is subordinate to the other (tracking changes independently of availability), so a composite/sub-state model was rejected. A third field (technical status) also exists and is treated as a separate, independent dimension.

**Ratified terminology:**
- "Availability Status" → rename to **Ownership** (column) / "Ownership Status" (filter label). Answers "whose is it?" (owned, sold, returned, written-off)
- "Tracking Status" → rename to **Location** (column) / "Location" (filter label). Answers "where is it?" (in-stock, in-transit, with-customer, on-hold)
- DB column names stay as-is (`availability_status_id`, `tracking_status_id`) — UI rename only, no migration needed.
- Ranked alternatives considered: "Ownership/Location" (winner), "Status/Location" (second), "Lifecycle/Stock State" (third — too ERP-jargony).

**Visual hierarchy decision:**
- Ownership is the PRIMARY status — colored pill. Drives business logic (determines valid actions).
- Location is SECONDARY — render as `text-xs text-muted-foreground` text stacked below the pill in the same table cell (no separate badge/column). Collapses two columns into one.
- Pattern reference: Linear's state pill + muted cycle text; Shopify's inventory vs fulfillment hierarchy.

**Status coupling — event-driven model (ratified):**
- Fields are kept independent at the data level but coupled via business events at the UI level.
- Business operations (Departure created → Location auto-sets to "in-transit"; sales invoice cleared → Ownership auto-sets to "sold") should drive status transitions. Clerks should NOT manually update both fields for an action with a known outcome.
- Fully coupled (one action locks both): too rigid — can't express valid edge states like "sold but still in-warehouse".
- Fully independent (manual both): leads to drift/zombie states within months.
- The event-driven approach is how Odoo and NetSuite handle this problem.

**Filtering:**
- Two separate MultiSelectOptions dropdowns (AND logic). No combined matrix filter.
- Do NOT block "invalid" cross-product combinations in the filter UI — return zero results with an explanatory empty state instead (e.g. "No assets match — sold assets are not typically in-stock").
- Current search page implementation is correct; only the filter label needs updating ("Tracking Status" → "Location").

**Known bug to fix:**
- `AvailabilityStatusBadge` default case maps all non-AVAILABLE/SOLD values (including ON_HOLD) to rose/red — semantically wrong. Every enum value needs an explicit color; ON_HOLD should not be an error color.

**Rejected proposal (2026-05-20) — "Stock Status + Location overload":**
- Proposed collapsing Ownership+Tracking into "Stock Status" (Purchased/InStock/Reserved/Sold/Unavailable) and merging zones (Receiving, Tech, In Transit) into the Location field alongside bin codes.
- Initial critique "bin code and process state are incompatible" was a misread: Receiving/Tech/In Transit are physical places (dock, repair bench, truck), not process lifecycle labels. That part of the proposal was valid — see Zone+Bin pattern below.
- Still rejected on two remaining grounds:
  1. Regression on event-driven model: proposal re-introduced manual dual-field updates, the exact zombie-state trap the event-driven approach was designed to prevent.
  2. Value set too coarse: "Unavailable" collapses held/in-repair/pending-sale — operationally distinct states managers need to filter separately. Critically, "Unavailable" is a disposition concept (parts, scrap, leased, returned), not a location, and was rejected as a zone value.
- The two-field Ownership/Location model with event-driven transitions remains ratified.

**Zone + bin pattern (Option B — ratified 2026-05-20):**
- Location is expressed as `zone` + `bin_code`, where zone is one of: `Bin | Receiving | Tech | InTransit | Unknown`.
- `bin_code` is populated only when `zone = Bin`. When an asset leaves a bin for Tech or Receiving, `bin_code` clears — the bin is immediately free. When it returns from repair, it gets a fresh bin assignment. There is no "home bin" concept.
- Reference: inFlow and Fishbowl treat staging zones as first-class peers of bins — same approach.
- `Unavailable` was explicitly rejected as a zone value — it is a disposition concept, not a physical place. Disposition (parts/scrap/leased/returned) belongs in the Ownership dimension.

**Zone + bin — rendering in the assets list cell:**
- `zone = Bin`: show bin_code (e.g. "A-12-3") in `text-xs text-muted-foreground` below the Ownership pill.
- `zone = Receiving | Tech | InTransit`: show the zone label (e.g. "Receiving", "Tech", "In Transit") in the same muted style — no bin code shown.
- `zone = Unknown`: show "—" (em-dash) in muted text. Never show a blank cell.
- One cell, one pattern — clerk reads the same slot regardless of zone type.

**Zone + bin — filtering:**
- "Show all assets at Tech" is a clean single-filter: `zone = Tech`. No cross-field logic needed.
- Filter dropdown for Location uses zone values as options (Bin, Receiving, Tech, In Transit, Unknown). When user selects "Bin", optionally expose a bin_code text input as a secondary filter.
- MultiSelectOptions pattern applies to zone filter (same as other fixed-list filters).

**Zone + bin — empty states:**
- "No assets in Tech" → "No assets are currently at the repair bench." (contextual label, not generic "No results").
- "Unknown" zone is valid data — assets temporarily unscanned. Do not treat as an error state in the UI.

**Terminal state / sold assets:**
- Sold + NULL location is not acceptable — creates silent disappearing assets.
- Model terminal state as an explicit archive flag or a "Departed"/"Delivered" Ownership value.
- Departed assets should be hidden from the default list view via a system filter, not deleted. They must remain queryable (GitHub/Linear pattern).

**"Sellable" filter preset:**
- Do not expose compound filter logic to the user.
- Implement as a saved Quick Search preset labeled "Available to sell" mapping to `Ownership=In Stock AND Location NOT IN (Tech, Receiving)`.
- Pattern reference: Shopify's derived available-inventory count — rules are hidden, the derived label is the surface.

**Why:** Linear/Shopify/GitHub all use orthogonal separate fields for independent dimensions. The "Owned + In Transit" and "Sold + In Warehouse" combos are operationally valid and the two-field model handles them cleanly.

**How to apply:** When adding new status values, always assign them explicit colors in the badge component (no default fallback). When building any status-related filter or column, use the Ownership/Location terminology. When designing any operation that moves an asset, check whether it should auto-transition one or both statuses rather than asking the clerk to update them manually.
