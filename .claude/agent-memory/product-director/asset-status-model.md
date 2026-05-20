---
name: asset-status-model
description: Loon per-unit asset status model — Inventory Status field + Location field (zone + bin_code) + in_transit boolean design decisions, rejected proposals, and MVP boundaries
metadata:
  type: project
---

## Design Decision: Two-Axis Model (Inventory Status + Location) + in_transit boolean

**Adopted:** Two separate fields — `inventory_status` (lifecycle/ownership state) and `Location` (zone + bin_code coordinate pair) — plus an `in_transit` boolean (decided, see below).

**Rejected:** Overloading a single `bin_code` string with mixed semantics — e.g. encoding "TECH" or "RECEIVING" as pseudo-bin values. Reason: loses type safety, makes querying ambiguous, and conflates two different concepts in one column.

**Decided (prior conversation, 2026-05-20):** `in_transit` boolean IS part of the model. Rationale documented in prior conversation history — reasons include query simplicity, lifecycle event triggers, and separation from zone semantics. Do not re-open this.

**Decided (2026-05-20):** Clearing Location on dispatch is acceptable. Location history is preserved independently (audit/history table). The live Location field can be set to null on sale/delivery without destroying audit trail. History and live-field are separate concerns.

**Clarified (not rejected):** Staging zones (Receiving, Tech, InTransit) ARE physical places, not lifecycle states. A repair bench is a place. A dock is a place. A truck is a place. These belong in Location, not Inventory Status.

---

## Inventory Status Field (Lifecycle/Ownership Status)

Field name: **Inventory Status** (`inventory_status` in DB). UI label: "Status" or "Inventory Status". Do NOT call this field "Disposition" — that is an academic/jargon term warehouse operators do not use. See [[feedback-no-disposition-term]].

Enum values (MVP):
- `On Order` — PO placed, not yet physically received (replaces "Purchased" — "Purchased" implies it's here)
- `Available` — on premises, cleared, can be sold/assigned. NOT "In Stock" — "In Stock" is a quantity aggregate concept (Zoho/Cin7 framing); "Available" is per-unit.
- `In QC` — arrived at dock but awaiting QC pass; bridges On Order → Available. Required: without it, arriving assets either appear Available prematurely or stay On Order incorrectly.
- `On Hold` — DERIVED from active Hold record; NOT a writable status field
- `Sold` — sold; triggers archive/soft-delete once Delivered (leaves active list)
- `Scrapped` — written off as scrap
- `Parted Out` — cannibalised for parts
- `Returned` — returned by customer; re-enters QC flow
- `Unknown` — legacy/migration values only. Keep in enum; **hide from create/edit dropdowns**; DO show in filter dropdowns so legacy data is discoverable and queryable.
- `Lost` — written off as unrecoverable (distinct from Unknown/Missing). Fast-follow v1.1.

**Removed:** `Leased` — not used. Dropped from enum entirely.

**Rejected:** `Unavailable` as a catch-all bucket — destroys reporting; GM cannot query by reason.
**Rejected:** "In Stock" as the label for Available — tautological for per-unit tracking, confuses users migrating from Zoho/Cin7 where "In Stock" means a quantity.

**Key rule:** `On Hold` / `Reserved` must be derived from the Holds feature, not a separately writable field. Dual-write creates guaranteed sync bugs. ShipHero's manually-settable "Reserved" is a known pain point in their support queue.

---

## Location Field

Location is a **two-part coordinate**: `zone` (enum) + `bin_code` (string, nullable).

### Zone Enum

- `Bin` — asset is in a specific named bin location; `bin_code` is required and populated
- `Receiving` — asset is at the inbound dock / receiving area (physical place, not a lifecycle state)
- `Shipping` — asset is at the outbound dock / shipping staging area (distinct from InTransit — asset is still on premises). Fishbowl and inFlow both distinguish Packing/Shipping staging from In Transit.
- `Tech` — asset is at a repair bench or tech area (physical place)
- `InTransit` — asset is off-premises, on a truck or in transit between locations
- `Unknown` — asset location is not known (replaces old `isMissing` boolean — zone is a better carrier for this)

### Bin code

- `bin_code`: string (e.g. `W0-01-011`), **only populated when `zone = Bin`**. Null for all other zones.
- When an asset leaves its bin for Tech or elsewhere, the bin is **freed for reuse**. No "home bin" concept.
- When an asset returns from Tech or Receiving, it gets a **fresh bin assignment**. There is no memory of where it was before.

### Competitor Comparison

| Competitor | Staging Zone Model |
|---|---|
| **inFlow** | Staging locations are first-class peers of bins — dock, receiving, and tech bench appear in the same location selector as bin locations. |
| **Fishbowl** | Same approach — staging locations (Receiving, Inspection, Scrap) are regular location records in the location hierarchy, not a separate status field. |
| **Sortly** | Uses a folder/hierarchy model (`Location > Sub-location`). "Tech Bench" is a sub-location just like a shelf. Staging zones are just locations with no bin codes. |
| **Asset Panda** | Free-text location field — no zone enum, no bin codes. Works for simple cases; breaks for warehouse floor ops. Their reviews cite this as the main gap. |
| **Asset Tiger** | Similar to Asset Panda — single location string, no structured zones. |

**Verdict:** Staging-as-peer-of-bin is the dominant pattern among warehouse-aware competitors (inFlow, Fishbowl, Sortly). Loon's `zone` enum is a clean, type-safe version of this.

---

## in_transit Boolean

**Decided:** `in_transit` is a first-class boolean field on the asset. It coexists with `zone=InTransit` — they are not redundant by design choice. Rationale is in prior conversation history: query simplicity, lifecycle event triggers, separation from zone semantics. Do not re-litigate.

---

## Invalid State Combinations to Guard

The Inventory Status × Location matrix admits nonsense combinations that need validation:

- `On Order + zone=Bin` — **invalid**: asset is not on premises; it has no physical location in the warehouse yet. Location should be null or absent entirely.
- `On Order + zone=Receiving` — **valid**: asset has arrived at dock but not yet formally received into inventory.
- `Available + zone≠Bin` — **suspicious**: an Available asset should normally be in a named bin. Warn on save; do not hard-block (edge cases exist).
- `InTransit zone` — **only valid** during an active Arrival, Transfer, or Departure workflow. Orphaned InTransit (no linked workflow) is a data quality error.
- `Sold + On Hold` — **invalid**: already sold, can't hold.
- `Scrapped/Parted Out + InTransit` — **invalid**: no use case.
- `Lost + zone=Bin` — **invalid**: if you know the bin, it's not lost.

Implement field-level validation (or a state machine) to enforce valid transitions.

---

## Inventory Status vs Current "Availability Status" Mapping

| Old Availability Status | New Inventory Status |
|------------------------|----------------------|
| Unknown | `Unknown` (legacy-only, hidden from create/edit UI) |
| Available | Available |
| Held | On Hold (derived) |
| Sold | Sold |
| Parts | Parted Out |
| Scrap | Scrapped |
| Returned | Returned |
| Leased | Removed — not used |

Old "Tracking Status" states (Missing, Purchasing, Inbound, Receiving, Repairing, In Stock, Packing, Outbound, Delivered) collapse into: Inventory Status + Location zone + Arrival status (already modeled separately via ArrivalStatus). See [[arrival-status-model]].

**Missing:** Previously modeled as `isMissing` boolean. Now carried by `zone=Unknown` — cleaner, no extra column, consistent with how zone is already queried.

---

## Dispatch / Archive Behavior

**Decided:** On sale/delivery, clearing Location (setting to null) is acceptable. Location history is persisted independently in the audit/history table — that trail is not affected by clearing the live field. Assets that are sold/delivered are archived (soft-deleted) and leave the active inventory list. The active list is for assets the warehouse is actively managing.

---

## MVP vs Deferred

- `MVP`: Inventory Status enum (On Order, Available, In QC, On Hold[derived], Sold, Scrapped, Parted Out, Returned; Unknown legacy-only hidden from create/edit); zone enum (Bin/Receiving/Shipping/Tech/InTransit/Unknown); bin_code when zone=Bin; in_transit boolean; On Hold derived from Holds; invalid combo validation (Postgres check constraint); clear Location on dispatch (history persists separately)
- `Fast-Follow (v1.1)`: Lost inventory status value; InTransit zone enforcement tied to active workflow records (orphan detection); auto-archive on Sold+Delivered; multi-warehouse transfer tracking
- `Future (v2+)`: Demo/Loaner status, Consigned status, sub-zone precision (which bench? which dock bay?)
- `Don't Build`: home-bin memory; Leased (not used); Consigned until a paying customer asks for it; "Unavailable" catch-all bucket
