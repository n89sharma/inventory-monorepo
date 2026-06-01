---
name: lifecycle-event-status-models
description: MVP status model for Arrival, Transfer, Departure event types — transitions, naming, asset side-effects, storage, and deferred items (ratified 2026-05-29)
metadata:
  type: project
---

## Research Date
May 2026 (ratified 2026-05-29)

## Adopted Status Model

**All three entities use the same 3-state model for MVP:**
`DRAFT` → `CONFIRMED` → `COMPLETED`

- Forward-only transitions. No Cancelled state in MVP. No Reopen action. No IN_TRANSIT state.
- Deletion is allowed only in Draft (existing permission gate).
- IN_TRANSIT deferred to v1.1 for all three types. Asset `is_in_transit` boolean retained for that future use.

## Storage

**Each entity has its own reference table** (`ArrivalStatus`, `TransferStatus`, `DepartureStatus`) — same pattern as the asset `Status` table. NOT a Prisma enum. Reason: enums are costly to evolve; reference tables let us add/rename/reorder states without schema migrations.

## Scheduled date

`scheduled_date: DateTime?` field on every Arrival, Transfer, Departure record. Treated as metadata, not a status. Display the "Scheduled" treatment in UI when `scheduled_date > now`. Matches Cin7 / inFlow / Odoo approach.

## Key Decisions

- **"Confirmed" is the noun.** Universal, no ERP smell, matches Shopify orders / Stripe invoices. Synonyms we rejected: "Authorised" (Cin7), "Issued" (inFlow), "Posted" (accounting).
- **Cancelled deferred.** No terminal side-branch in MVP. Future: reachable only from Draft/Confirmed, never Completed; releases locked assets.
- **Reopen deferred.** Completed is permanently locked in MVP.
- **IN_TRANSIT semantics preserved for v1.1** — Arrival IN_TRANSIT = supplier-side (goods on truck from vendor). Transfer IN_TRANSIT = custody-gap between our own warehouses. When re-added, asset location = "In Transit" zone during that window.
- **Forward-only simplicity is acceptable for MVP** — known trade-off, will be revisited when v1.1 adds Cancelled/Reopen.

## Asset Side-Effects per Transition

### Arrivals
**Resolved (2026-05-29):** Arrival uses a separate `OrderedAsset` entity (UI label "Expected Asset") to carry the pre-receipt state. See [[ordered-asset-model]] for the full model. Asset side-effects per transition:
- **Draft:** no Asset records. Per-unit OrderedAsset rows added/edited freely.
- **Confirmed:** no Asset records. OrderedAsset rows locked.
- **Completed:** receive workflow creates Asset records from each matched OrderedAsset (status = Available, zone = Receiving, destination warehouse). Unmatched scans create unplanned Assets without an `ordered_asset_id` link. Unscanned OrderedAssets are marked Not Received. Completion blocked if any OrderedAsset is still Pending.

Pre-allocation (attaching in-transit assets to Holds/Departures) is **deferred to v1.1+** — OrderedAssets are Arrival-internal only. Stranded Confirmed Arrivals (no goods ever arrive, no MVP exit path) are accepted as a known limitation since no real Assets were ever created.

### Transfers
- **Draft:** no asset change. Soft warning if asset already attached to another same-type Draft.
- **Confirmed:** no asset change. Origin location stays (stale for MVP, acceptable). UI shows "Pending transfer to [Warehouse B] — Transfer #T-xxx" callout on asset details. Hard block on adding asset to another same-type Confirmed.
- **Completed:** asset status = In Stock; location = destination warehouse's Shipping & Receiving zone.

### Departures
- **Draft:** no asset change. Soft warning if asset already attached to another same-type Draft.
- **Confirmed:** asset status = **Sold**. Location unchanged (asset still physically on premises). Hard block on adding to another same-type Confirmed. Trade-off: fires Sold semantics before dispatch; revisit if accounting/reporting friction emerges. Visibility in active list is governed by `is_departed`, NOT by `status = Sold` — Confirmed-but-not-yet-shipped assets remain visible to floor staff.
- **Completed:** `location_id` = null; `is_departed` = true; status stays Sold. UI renders location as "Departed". `is_departed` is never cleared in MVP (no cancel/reopen).

## Asset-Locking Semantics

An asset is "locked" when attached to any event in Draft or Confirmed state.
- **Same-type Draft:** soft warning (allowed with confirmation).
- **Same-type Confirmed:** hard block. Error message names the blocking event with a link.
- **Cross-type:** soft warning, not blocked.

Scanner flow: red flash + "ALREADY ON [Event #]" + link to blocking event. No confirmation dialog for hard blocks.

## List-Page Filtering

**No default filter change.** Completed events are NOT hidden by default — current collection list filters (date range + warehouse) remain. Status badge in the table column is the only visible cue. Status MultiSelect filter deferred to v1.1.

## Permissions

Reuse existing `create_update_arrival` / `create_update_transfer` / `create_update_departure` permissions for Confirm and Complete transitions. No new `confirm_*` or `complete_*` permission verbs in MVP.

## Audit

Every Draft → Confirmed and Confirmed → Completed transition writes to the existing `historyService` (who, when, from/to states). No bespoke lifecycle event log.

## Migration / Backfill

All existing Arrival/Transfer/Departure rows are backfilled to `status = Completed` at migration time. Existing rows already represent finalized events under the implicit old model.

## Competitor Reference (event/transaction statuses)

| Competitor | Arrival/PO | Transfer | Departure/SO |
|---|---|---|---|
| Cin7 | Draft → Authorised → Partially Received → Received → Closed | Draft → Authorised → Sent → Received | Draft → Authorised → Picking → Packed → Shipped → Fulfilled |
| inFlow | Draft → Issued → Receiving → Fully Received → Cancelled | Draft → Sent → Received | Draft → Issued → Picking → Shipped → Paid |
| Fishbowl | Entered → Issued → Partial → Received → Closed | Pending → Committed → Fulfilled | Entered → Issued → Picking → Partial → Fulfilled |
| Zoho | Draft → Confirmed → Billed | (In Transit) → Received | Draft → Confirmed → Packed → Shipped → Invoiced |
| Shopify (orders) | — | — | Draft → Open → Fulfilled |
| Stripe (invoices) | Draft → Open → Paid | — | — |
| Sortly / Asset Panda | None | None | None |

## Deferred Items

**Fast-Follow v1.1:**
- Cancelled state (terminal, releases locked assets, preserves audit)
- Reopen action (Confirmed → Draft, Cancelled → Confirmed)
- Arrival asset-side-effects (post OrderedAsset resolution)
- Return/Reversal events (linked to Completed departure/arrival)
- Partial completion (per-asset-line status within an event)
- Status MultiSelect filter on list pages
- IN_TRANSIT for Transfer (between Confirmed and Completed)

**Future v2+:**
- Approval workflows (named approver required for Confirmed transition)
- Auto-transition on `scheduled_date` (cron-driven advancement)
- Financial posting / Incoterms-aware accounting entries
- IN_TRANSIT for Arrival/Departure

**Don't Build:**
- PENDING as a status (synonym for Draft — pick one noun)
- PROCESSING as a status (no user action attached — it's a duration, not a state)

## See Also

- [[asset-status-model]] — asset Inventory Status enum, `is_departed` boolean, active-list rule
- [[ux-lifecycle-event-statuses]] — UI/badge/transition surface decisions
