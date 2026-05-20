---
name: project_status_model
description: Loon's two-status model — field names, enum values, valid combos, lifecycle transitions, and competitor benchmarks
metadata:
  type: project
---

## Decision: Rename availability_status + tracking_status

**Why:** "Availability" is ambiguous (calendar/booking connotation); "Tracking" sounds like GPS. Industry-standard vocabulary from NetSuite and SAP is cleaner.

| Old field | New field | DB column |
|---|---|---|
| availability_status | Stock Status | stock_status_id |
| tracking_status | Location Status | location_status_id |

DB model renames: AvailabilityStatus → StockStatus, TrackingStatus → LocationStatus.

## StockStatus enum values

AVAILABLE, RESERVED (replaces HELD), SOLD, RETURNED, WRITTEN_OFF

- HELD → rename to RESERVED. "Reserved" is the industry term (NetSuite: Committed, ShipHero: Allocated).

## LocationStatus enum values

RECEIVING, IN_STOCK (replaces IN_WAREHOUSE), IN_TRANSIT, DISPATCHED, RETURNED_IN_TRANSIT

## Key lifecycle bugs found in current model

1. Transfer service does NOT update any status — assets in transit are invisible to the GM.
2. Departure service does NOT update any status — dispatched assets are invisible.
3. No mechanism sets SOLD — unclear if invoiceService does this.
4. No putaway transition exists: RECEIVING never flips to IN_STOCK automatically.

## Status transitions by operation

| Operation | Stock Status | Location Status |
|---|---|---|
| Arrival created + asset added | AVAILABLE | RECEIVING |
| Asset put away | AVAILABLE | IN_STOCK |
| Hold created | RESERVED | (unchanged) |
| Hold released | AVAILABLE | (unchanged) |
| Transfer created | (unchanged) | IN_TRANSIT |
| Transfer completed | (unchanged) | IN_STOCK |
| Departure created | (unchanged) | DISPATCHED |
| Sales invoice cleared | SOLD | (unchanged) |
| Return arrival created | RETURNED | RECEIVING |

## Competitor patterns

- Sortly: single "Status" field — no location dimension. Their biggest G2 complaint.
- Asset Panda: "Status" (user-defined) + "Location" (hierarchical, no transit concept).
- inFlow: order-level status only; no per-unit lifecycle status.
- NetSuite: "Lot/Serial Status" (Available/Committed/In Transit) — closest to Loon's model.
- SAP: "Stock Type" (Unrestricted/QC/Blocked) + "Special Stock" (In Transit/Consignment).
- Odoo: derives serial state from location; uses virtual transit location — no standalone status.

## Deferred

- QUARANTINE/QC_HOLD location status → v1.1 (technical_status covers defective for MVP)
- CONSIGNMENT/LOANED stock status → v2
- BACKORDERED → v2 (requires PO model)
- ALLOCATED vs RESERVED split → v2
