---
name: ux-lifecycle-event-statuses
description: Design decisions for Arrival/Transfer/Departure event statuses — naming, transitions, badges, list filtering, edit affordances, and asset side-effects (MVP, ratified 2026-05-29)
metadata:
  type: project
---

## Ratified status vocabulary (2026-05-29)

**Three states for MVP, all three entities:** Draft → Confirmed → Completed.
- No Cancelled state in MVP. Deletion only, available in Draft (existing permission gate).
- No Reopen action in MVP. Forward-only transitions.
- No In Transit state in MVP. The IN_TRANSIT slot remains designed but deferred for all three; Asset `is_in_transit` boolean is retained for future use.
- "Confirmed" wins over Locked / Ready / Posted / Finalized — warehouse-staff vocabulary; matches Shopify orders.
- "Scheduled" is NOT a status — it is a `scheduled_date` field on the event. A scheduled event is a Confirmed event with `scheduled_date > now`.

## Status field representation

**Stored in a separate reference table per entity** (e.g. `ArrivalStatus`, `TransferStatus`, `DepartureStatus`) — same pattern as the asset `Status` table. NOT a Prisma enum. Reason: enums are hard to evolve (migration cost on every value change); reference tables let us add states, rename labels, and reorder without schema migrations.

## Scheduled date

`scheduled_date: DateTime?` field on every Arrival, Transfer, and Departure record. Set at Draft or Confirmed; not required. Displayed as a muted "Scheduled for [date]" callout in the summary strip on details pages. A list-page quick-filter chip ("Scheduled") shows Confirmed events with `scheduled_date > today`. Not a badge, not a banner — informational metadata.

## Status transition surface

- Single primary button in the StickyDetailsPageHeader actions slot. Pattern: Shopify draft orders ("Mark as Confirmed"), Stripe invoices ("Finalize").
- Button copy follows verb + object: "Confirm Arrival" → "Mark Complete"; "Confirm Transfer" → "Mark Complete"; "Confirm Departure" → "Mark Complete".
- The button's label changes as status advances. In Completed (terminal state for MVP), button is absent.
- Confirmation dialog gates the Confirm transition (assets will be locked). Completing an already-Confirmed event needs no dialog — it is the expected forward action.

## Badge visual treatment

- Event status badges use an outlined/ring variant (border + transparent fill) to distinguish from filled-pill asset Status badges. Same pill shape, same font size, different fill register.
- Color semantics:
  - Draft: bg-neutral/muted, text-muted-foreground — "not yet real"
  - Confirmed: bg-blue-100, text-blue-700 border-blue-200 — "committed, active"
  - Completed: bg-green-100, text-green-700 border-green-200 — "done, historical"
- Badge appears in: list-page table column, details-page StickyDetailsPageHeader subtitle area.

## List-page filtering

**No default filter change.** Completed events are NOT hidden by default — current collection list filter behavior is preserved. The existing date-range + warehouse filters remain the primary controls.

A future v1.1 may add a status MultiSelectOptions filter, but MVP keeps the list page as-is. Status badge in the table column is the only visible cue.

## Read-only state when Confirmed/Completed

- Do NOT grey fields. Use Stripe's pattern: fields become text (non-interactive) with a subtle background token (bg-muted/5 or bg-accent/30); the Edit button in CollectionEditBar is hidden in non-Draft states.
- A banner below the StickyDetailsPageHeader announces the locked state: "This [arrival] is confirmed and cannot be edited." Inline banner, neutral/info color — not a toast, not a modal.
- Asset table: remove the Remove and Edit asset controls. The add-asset bar is hidden.
- No Reopen in MVP — once Completed, the record is permanently locked from editing.

## Permissions

Reuse existing `create_update_arrival` / `create_update_transfer` / `create_update_departure` permissions for the Confirm and Complete transitions. No new `confirm_*` or `complete_*` permission verbs in MVP.

## Asset-side effects at each transition (ratified 2026-05-29)

### Arrivals
- **Draft:** Arrival exists with metadata (vendor, destination, dates, notes). User adds Expected Assets (per-unit `OrderedAsset` rows) via a bulk-add control ("Add 10 of Model X" → 10 rows). No real Asset records exist yet. Soft-lock on Expected Asset rows: can be added/removed freely. See [[ordered-asset-model]].
- **Confirmed:** Expected Asset rows locked from add/remove/edit. Arrival metadata locked. Still no Asset records. Headline metric: "N expected, awaiting arrival."
- **Completed:** Receive workflow runs. UI is a **one-page reconciliation screen** listing every Expected Asset. Scanner matches scans to Pending rows by model (first-fit, oldest-Pending-by-created_at when multiple rows share model). Matched rows → create Asset record (status = Available, zone = Receiving, `arrival_id` and `ordered_asset_id` set). Scans with no matching Pending row → create Asset without `ordered_asset_id` (rendered with "Unplanned" badge). Unscanned Pending rows are bulk-marked Not Received at the Finish & Complete action. Completion blocked if any Expected Asset is still Pending. Headline metric: "8 received, 2 not received, 1 unplanned."

UI label for OrderedAsset entity: **"Expected Asset"**. Lives exclusively inside Arrival details — not in global search, asset list, query page, or any cross-entity surface.

### Transfers
- **Draft:** no asset change. Soft warning if asset already attached to another same-type Draft.
- **Confirmed:** no asset change. Stale origin location tolerated for MVP. Surface a muted inline callout on asset details: "Pending transfer to [Warehouse B] — Transfer #T-xxx". Hard block on adding to another same-type Confirmed.
- **Completed:** assets status = In Stock; location = destination warehouse's Shipping & Receiving zone. `pending_transfer_id` cleared (if implemented).

### Departures
- **Draft:** no asset change. Soft warning if asset already attached to another same-type Draft.
- **Confirmed:** asset status = **Sold**. Location unchanged (asset is still physically on premises). Hard block on adding to another same-type Confirmed. Trade-off acknowledged: this fires Sold semantics before dispatch; revisit if it causes accounting or reporting friction. Asset visibility in the active list is governed by `is_departed`, NOT by `status = Sold` — so Confirmed-but-not-yet-shipped assets remain visible to floor staff.
- **Completed:** `location_id` = null; `is_departed` = true; status stays Sold. UI renders location as "Departed" when `is_departed = true`. The is_departed flag is set at Completed and never cleared in MVP (no cancel/reopen).

## Active-list rule for assets

The asset "active list" filter shows `is_departed = false`. NOT based on `status = Sold`. This decouples archival from status so that pre-departure Sold assets remain visible until the truck leaves.

## Asset-locking semantics (unchanged from prior memo)

- **Same-type Draft:** soft warning when adding an asset already on another same-type Draft. Not blocked.
- **Same-type Confirmed:** hard block. Error message names the blocking event with a link.
- **Cross-type:** soft warning, not blocked.

## Asset details page — locked-by banner

When asset is attached to a non-Completed lifecycle event: slim info banner below sticky header — "Locked by Arrival #A-260528-001 (Confirmed) [View]". Banner disappears when event completes. Inverse link of the event page's asset list.

## Status-transition audit

Every Draft → Confirmed and Confirmed → Completed transition writes to the existing history service (`historyService`). Records who, when, and the from/to states. No bespoke lifecycle event log — reuse existing audit infrastructure.

## Backfill (migration)

All existing Arrival/Transfer/Departure rows are backfilled to status = Completed at migration time. Existing rows already represent finalized events under the implicit old model (assets are in stock / sold the moment the entity exists).

## Deferred / Pending

- **Pre-allocation to Hold/Departure for in-transit assets** — deferred to v1.1+. Expected Assets cannot be attached to Holds or Departures in MVP. Salesperson allocation waits until Arrival is Completed. See [[ordered-asset-model]].
- **Cancelled state** — deferred post-MVP. When added: terminal side-branch from Draft/Confirmed; releases locked assets.
- **Reopen** — deferred post-MVP.
- **In Transit** — deferred for all three entities. `is_in_transit` boolean on Asset retained for v1.1.
- **Status-filter MultiSelect on list pages** — deferred.
- **Auto-transition on scheduled_date (cron-driven advancement)** — deferred.

## Why

"Draft / Confirmed / Completed" is the dominant pattern in Shopify, Stripe, and double-entry accounting ERP. Warehouse staff who have touched any B2B e-commerce or basic ERP tool already have this mental model. Introducing novel terms (Locked, Finalized, Posted) adds onboarding friction with no benefit. Scheduled-as-metadata avoids status proliferation — the single most common ERP UX mistake.

## How to apply

When building the transition button, check status and render the correct label. When building list-page columns, show the event status badge (outlined variant). When designing any asset operation that touches a lifecycle event, check whether it should auto-transition the event status and update Asset status / location / `is_departed` simultaneously.
