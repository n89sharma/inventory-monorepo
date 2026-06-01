---
name: asset-status-model
description: Loon per-unit asset model — Inventory Status field + Location (zone + bin_code) + in_transit boolean + is_departed boolean. Decisions, rejected proposals, and MVP boundaries (ratified 2026-05-29)
metadata:
  type: project
---

## Design: Three-Axis Model

**Adopted:** Three orthogonal fields on Asset:
1. `inventory_status` (FK to `Status` reference table) — lifecycle/ownership state
2. `Location` = `zone` (FK to zone reference) + `bin_code` (string, nullable) — physical coordinate
3. Two booleans: `is_in_transit` and `is_departed` — flags for cross-cutting states

**Rejected:** Overloading a single `bin_code` string with mixed semantics (e.g. encoding "TECH" or "RECEIVING" as pseudo-bin values). Loses type safety, conflates concepts.

**Clarified:** Staging zones (Receiving, Tech) ARE physical places, not lifecycle states. A repair bench is a place. A dock is a place. These belong in Location, not Inventory Status.

---

## Inventory Status Field

DB column: `status_id` → `Status` reference table. UI label: "Status" or "Inventory Status". Do NOT call this field "Disposition" (academic jargon warehouse operators do not use).

**Enum values (MVP):**
- ~~`On Order`~~ — REMOVED from asset enum. See [[lifecycle-event-status-models]]; the pre-receipt state is being modeled as a future separate `OrderedAsset` entity, not as an asset status. (Pending OrderedAsset decision — see `.notes/lifecycle-notes.md` items #1–#4.)
- `Available` — on premises, cleared, can be sold/assigned. NOT "In Stock" (that is a quantity-aggregate concept from Zoho/Cin7; "Available" is per-unit).
- `In QC` — arrived at dock but awaiting QC pass; bridges receipt → Available.
- `On Hold` — DERIVED from active Hold record; NOT a writable status field.
- `Sold` — sold; **set at Departure Confirmed** (not Completed). Asset may still be physically on premises while Sold. Active-list visibility is governed by `is_departed`, NOT by Sold status. Trade-off acknowledged; revisit if accounting/reporting friction emerges.
- `Scrapped` — written off as scrap.
- `Parted Out` — cannibalised for parts.
- `Returned` — returned by customer; re-enters QC flow.
- `Unknown` — legacy/migration values only. Hide from create/edit dropdowns; show in filter dropdowns so legacy data stays queryable.

**Removed:** `Leased` (not used), `Reserved` (we chose Sold-at-Confirmed instead — see [[lifecycle-event-status-models]]), `Lost` (deferred).

**Rejected:** `Unavailable` as catch-all bucket (destroys reporting).
**Rejected:** "In Stock" as the label for Available (tautological for per-unit tracking).

**Key rule:** `On Hold` is the only derived status — it derives from an active Hold record. All other statuses are writable / set explicitly by lifecycle events. Dual-write between status and event state was the prior failure mode (Reserved-derived-from-Departure); we now keep Sold writable and use `is_departed` for archival semantics instead.

**Transfer pending indicator:** When asset is on a Transfer in Confirmed state, location stays at origin (stale, acceptable for MVP). A `pending_transfer_id` FK on Asset signals the pending transfer. UI shows "Pending Transfer to [Destination]" badge. Cleared at Transfer Completed.

---

## Location Field

Two-part coordinate: `zone` (FK to Zone reference) + `bin_code` (string, nullable).

### Zone values
- `Bin` — asset in a specific named bin; `bin_code` required and populated.
- `Receiving` — inbound dock / receiving area (physical place). New assets land here at Arrival Completed.
- `Shipping` — outbound dock / shipping staging area (still on premises). Distinct from in-transit.
- `Tech` — repair bench / tech area.
- `InTransit` — off-premises, on a truck between locations.
- `Unknown` — location not known (replaces old `isMissing` boolean).

**Removed:** `Departed` zone. We now use `location_id = null` + `is_departed = true` on Asset instead. Reason: "Departed" is not a place — it is neither a warehouse, a zone, nor a bin. It is an event state. Modeling it as a boolean flag keeps Location's semantics clean and lets UI render "Departed" derivably.

### Bin code
- `bin_code`: string (e.g. `W0-01-011`), only populated when `zone = Bin`. Null for all other zones.
- When an asset leaves its bin (for Tech or elsewhere), the bin is freed for reuse. No "home bin" concept.
- When an asset returns from Tech / Receiving, it gets a fresh bin assignment. No memory of prior bin.

### Competitor Comparison
| Competitor | Staging Zone Model |
|---|---|
| **inFlow** | Staging locations are first-class peers of bins. |
| **Fishbowl** | Staging locations are regular location records in the hierarchy. |
| **Sortly** | Folder/hierarchy model. Staging = locations with no bin codes. |
| **Asset Panda / Asset Tiger** | Free-text location. Breaks for warehouse floor ops. |

Verdict: staging-as-peer-of-bin is the dominant pattern. Loon's `zone` enum is a clean, type-safe version.

---

## is_in_transit Boolean

First-class boolean on Asset. Coexists with `zone = InTransit` by design choice — rationale (query simplicity, lifecycle event triggers, separation from zone semantics) is in prior conversation history. Do not re-litigate. Retained for v1.1 IN_TRANSIT state work; dormant for MVP.

---

## is_departed Boolean

First-class boolean on Asset. Set to `true` at Departure Completed, when:
- `location_id` → null
- `status` stays `Sold` (already set at Departure Confirmed)
- `is_departed` → true

Never cleared in MVP (no cancel/reopen). UI renders Asset location as "Departed" when `is_departed = true`. Replaces the prior `Departed` zone tombstone idea.

---

## Active-List Rule

The asset "active list" filter shows assets with `is_departed = false`. NOT based on `status = Sold`. This decouples archival from status so that Confirmed-but-not-yet-shipped (Sold + on-premises) assets remain visible to floor staff who need to find them.

---

## Invalid State Combinations to Guard

- `Available + zone ≠ Bin` — **suspicious**. Warn on save; do not hard-block.
- `InTransit zone` — **only valid** during an active Transfer/Departure workflow. Orphaned InTransit = data quality error.
- `Sold + On Hold` — **invalid**.
- `Scrapped / Parted Out + InTransit` — **invalid**.
- `is_departed = true + location_id ≠ null` — **invalid**. Departed assets must have null location.
- `is_departed = true + status ≠ Sold` — **invalid**. Only Sold assets can be departed.

Implement field-level validation or a state machine.

---

## Old Availability Status → New Inventory Status

| Old | New |
|---|---|
| Unknown | `Unknown` (legacy-only, hidden from create/edit) |
| Available | `Available` |
| Held | `On Hold` (derived) |
| Sold | `Sold` |
| Parts | `Parted Out` |
| Scrap | `Scrapped` |
| Returned | `Returned` |
| Leased | removed |

Old "Tracking Status" states (Missing, Purchasing, Inbound, Receiving, Repairing, In Stock, Packing, Outbound, Delivered) collapse into Inventory Status + Location zone + Arrival/Transfer/Departure status (modeled separately — see [[lifecycle-event-status-models]]).

**Missing:** carried by `zone = Unknown` (cleaner than the old `isMissing` boolean).

---

## Dispatch / Archive Behavior

At Departure Completed:
- `status` stays `Sold` (set earlier at Departure Confirmed)
- `location_id` → null
- `is_departed` → true

Asset disappears from active list (the `is_departed = false` filter). Location history is preserved independently in the audit/history table — live `location_id` being null does not destroy audit trail.

UI renders the live Location as "Departed" when `is_departed = true`. Historical location queries use the history table.

---

## MVP vs Deferred

**MVP:**
- Inventory Status enum (Available, In QC, On Hold derived, Sold, Scrapped, Parted Out, Returned, Unknown legacy-only)
- Zone enum (Bin / Receiving / Shipping / Tech / InTransit / Unknown)
- `bin_code` populated only when `zone = Bin`
- `is_in_transit` boolean (dormant)
- `is_departed` boolean (set at Departure Completed)
- On Hold derived from Holds
- Active-list filter on `is_departed = false`
- Invalid-combo validation (Postgres check constraints)
- Dispatch: location null + `is_departed = true`

**Fast-Follow (v1.1):**
- `Lost` inventory status value
- InTransit zone enforcement tied to active workflow records (orphan detection)
- Multi-warehouse transfer pending-state polish
- `OrderedAsset` entity for pre-receipt state (pending decision — `.notes/lifecycle-notes.md` #1–#4)
- Cancelled/Reopen for lifecycle events ([[lifecycle-event-status-models]])

**Future (v2+):**
- Demo/Loaner status
- Consigned status
- Sub-zone precision (which bench? which dock bay?)

**Don't Build:**
- Home-bin memory
- Leased (not used)
- Consigned until a paying customer asks
- "Unavailable" catch-all bucket
- `Departed` as a zone value (now modeled as `is_departed` boolean)
- `Reserved` as an inventory status (we chose Sold-at-Confirmed; revisit if accounting friction emerges)

## See Also

- [[lifecycle-event-status-models]] — Arrival/Transfer/Departure status model, asset side-effects per transition
- [[ux-lifecycle-event-statuses]] — UI/badge/transition surface decisions
