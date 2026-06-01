---
name: ordered-asset-model
description: OrderedAsset (UI label "Expected Asset") — per-unit pre-receipt entity owned by Arrival. Lifecycle, receive workflow, scope boundaries, deferred items (ratified 2026-05-29)
metadata:
  type: project
---

## What it is

`OrderedAsset` is a per-unit, pre-receipt entity that exists only inside the Arrival lifecycle. UI label: **"Expected Asset"**. One OrderedAsset row = one physical unit the warehouse expects to receive. Converts into a real `Asset` row at Arrival Completion.

## Why it exists (and why it's narrow)

Real Asset records cannot be created before goods are physically received — serial numbers are unknown, barcode labels haven't been printed, and physical inspection hasn't happened. Yet warehouses need a way to declare "we have ordered 10 of Model X" while a vendor's truck is in transit, so the Arrival Confirmed state has something concrete to lock.

OrderedAsset solves this by being a **manifest entity, not an inventory entity**. It is intentionally narrow:
- Not attachable to Holds or Departures
- Not visible in global search, asset list, or query page
- Has no accessories, technical specs, comments, errors, or files
- Has no barcode (a real barcode is generated only at receive-time)

## Scope boundaries (do NOT extend without re-deciding)

- **OrderedAssets cannot be allocated to Holds or Departures.** Pre-allocation to a salesperson while goods are in transit is a real use case but is deferred to v1.1+. To allocate, the user waits until Arrival is Completed and the OrderedAsset becomes an Asset.
- **OrderedAssets do not appear outside the Arrival details page.** No standalone list, no create page, no search index entry.
- **OrderedAssets do not have rich asset-detail fields.** Specs and accessories belong only to the post-receipt Asset.

## Lifecycle (per-row sub-state)

`Pending` → `Received` | `Not Received`

Three states only. "Cancelled" and "Missing" collapse into the single "Not Received" — we do not distinguish between vendor-confirmed-cancellation and unexplained-no-show in MVP. Both mean "the unit did not arrive."

- **Pending:** default state at creation. Editable in Draft, locked in Confirmed.
- **Received:** set at Arrival Completion when a scan matches this row. Triggers Asset creation.
- **Not Received:** set at Arrival Completion for any row still Pending when the operator clicks Finish & Complete. Bulk action; no per-row dialog.

Status stored in a reference table (`OrderedAssetStatus`) — same no-Prisma-enum rule as event statuses.

## Fields

To be detailed later (user deferred). Working minimum: `model_id` (required), plus optional `expected_cost`, `country_of_origin_id`, `notes`. Serial number is NOT a field on OrderedAsset — serials are captured on the real Asset at receive-time.

## Add UX (Draft)

Bulk add via "Add N of Model X" control. Produces N per-unit OrderedAsset rows in one operation. After adding, the user can edit individual rows (for the rare case where cost or country differs across units). Add / remove / edit operations are blocked in Confirmed.

## Receive UX (Completion)

**One-page reconciliation screen.** Clicking "Mark Complete" from a Confirmed Arrival opens this screen.

- The screen lists every OrderedAsset row with status indicator (Pending by default).
- A scanner input at the top accepts barcodes (a scan reads as "the operator received this physical unit").
- **Matching:** when a scan is received, the system finds the **oldest Pending OrderedAsset by `created_at`** whose model matches the scanned unit's model. First-fit. No user disambiguation.
- Matched row flips to Received; the system records the scanned barcode and captured serial; an Asset row is queued for creation.
- **Unplanned scan:** if a scan does not match any Pending OrderedAsset (over-receipt), an Asset is queued for creation **without** an `ordered_asset_id` link. The reconciliation table shows it as an extra row with an "Unplanned" badge.
- **Finish & Complete action:** any rows still Pending at this point are bulk-marked Not Received. Asset rows for all Received and Unplanned items are created in one transaction. Arrival status flips to Completed.
- **Completion gating:** the Finish button is enabled only when zero rows are in an unresolved state — i.e., the operator has either scanned every row or accepted the "remaining will be marked Not Received" prompt.

## Asset creation rules at conversion

For each Received OrderedAsset:
- New `Asset` row with `model_id` copied from OrderedAsset, `arrival_id` set, `ordered_asset_id` FK set, status = `Available`, zone = `Receiving`, `location_id` pointed at the destination warehouse's Receiving zone.
- Barcode generated at scan-time using existing warehouse-prefixed sequence.
- Serial captured from the scan workflow.
- `expected_cost`, `country_of_origin_id`, notes copied from OrderedAsset where set.

For each Unplanned scan:
- New `Asset` row with `arrival_id` set, `ordered_asset_id` = null. All other fields populated from the scan workflow.

## OrderedAsset row preservation

OrderedAsset rows are **kept** after conversion, with `received_at` timestamp and the implicit link via `Asset.ordered_asset_id`. Preserves variance reporting ("what we ordered vs what we received"). Matches Cin7 / Fishbowl / inFlow PO-line preservation patterns.

## Stranded Confirmed Arrivals

If an Arrival is Confirmed but the vendor never delivers and the operator never runs the receive workflow, the Arrival remains Confirmed indefinitely. No MVP exit path. **Accepted limitation** — since no real Asset records were ever created, no inventory data is corrupted; the stranded Arrival is just an open record. Cleanup is an admin DB task until v1.1 adds Cancelled.

## Existing-flow disruption

Today's "scan assets directly into a new Arrival" single-step path is **replaced** by the 3-step Draft → Confirmed → Completed flow. All new Arrivals walk through the three states. Existing Arrival rows are backfilled to `status = Completed` and their assets retain `ordered_asset_id = null` (they were never expected; they were directly created under the old flow).

Operator UX change is significant — worth coordinating rollout messaging.

## "Create & Receive Now" fast-path

To preserve today's UX speed for walk-in arrivals (truck shows up unannounced, no pre-known manifest), the Create Arrival form offers a **"Create & Receive Now"** button alongside the standard "Save as Draft" action.

- The button is enabled only when zero Expected Assets have been added to the form (the walk-in case).
- Clicking it: creates the Arrival in Draft, programmatically transitions to Confirmed, and routes the user directly to the reconciliation screen — all in one server round-trip.
- All three state transitions are still recorded in the history service with the same user and timestamp. No bespoke audit entry; the rapid Draft → Confirmed sequence is honest.
- The standard "Save as Draft" path remains available for users who want to declare expected goods before the truck arrives.

This is a UX optimization, not a separate code path: the underlying transitions and reconciliation workflow are identical to the manual case. Operators get a 1-click experience for the common walk-in case and the 3-click experience when they need the manifest discipline.

## Deferred Items

**v1.1+:**
- Pre-allocation: attach OrderedAsset to Hold or Departure while in transit. Requires polymorphic FK design (Hold/Departure references either Asset or OrderedAsset). Significant schema and UI work.
- Cancelled state on Arrival → bulk-mark all Pending OrderedAssets as Not Received and unlock for cleanup.
- "Stale draft" indicator after N days of inactivity.
- Vendor-confirmed Cancellation as a separate row state (distinct from Not Received) if accounting/audit needs the distinction.

**Don't Build:**
- OrderedAsset as a first-class searchable inventory entity
- OrderedAsset rich-detail fields (specs, accessories, comments)
- Per-row dialog at Completion for marking Not Received (bulk action is sufficient)

## See Also

- [[lifecycle-event-status-models]] — Arrival/Transfer/Departure status model
- [[asset-status-model]] — Asset Inventory Status enum and zone model
- [[ux-lifecycle-event-statuses]] — UI/badge/transition surface decisions
