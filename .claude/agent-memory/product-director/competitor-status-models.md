---
name: competitor-status-models
description: Two-axis status research across Cin7, inFlow, Fishbowl, Katana, Zoho Inventory — lifecycle status + stock/location status enums, serialization support
metadata:
  type: project
---

## Research Date
May 2026 — grounded in current docs via WebSearch/WebFetch.

## Two-Axis Framework
- **Axis 1 (Ownership/Lifecycle):** "Do we own it / can we sell it?" — product-level lifecycle status
- **Axis 2 (Stock/Location):** "Where is it physically / how much is available?" — quantity concepts and stock status

---

## Cin7 Core

### Axis 1 — Product Lifecycle Status
Field: **Status** (product record)
- `Active` — can be used in transactions
- `Deprecated` — removed from active use; cannot be selected for purchase/sale/production

Note: Only two confirmed values. No "Inactive" label confirmed — Cin7 uses "Deprecated" not "Inactive" as the off-state.

### Axis 2 — Stock Quantity Concepts
Field names on product availability view:
- `On Hand` — quantity expected in warehouse based on actual transactions
- `Available` = On Hand minus Allocated
- `Allocated` — reserved for pending authorized sales/work orders not yet completed
- `On Order` — ordered from suppliers, not yet received

### Serialization
Cin7 Core supports serial and batch numbers for traceability (FIFO/FEFO/Special costing methods). Serial numbers are assigned at receive/ship time. **No per-unit status field** on individual serials — traceability only, not a discrete status. Known gap: does not enforce serial number uniqueness (duplicate serials possible).

---

## inFlow Inventory

### Axis 1 — Product Lifecycle Status
Field: **Product Type** filter (UI label)
- `Active` — default, available for all transactions
- `Deactivated` — hidden from lists; still appears in Current Stock if qty > 0; can be reactivated

Note: Only two confirmed values. No Archived/Discontinued tier.

### Axis 2 — Stock Quantity Concepts
Fields (exact labels from support docs):
- `On Hand` — physically at location(s) including reserved, minus picked
- `Available` — what's left after fulfilling all open sales and manufacture orders
- `Reserved` — allocated to: sales orders, stock transfers, manufacture orders, anticipated builds, expiring stock
- `Picked` — pulled for orders, awaiting shipment
- `On Order` — subdivided: waiting on vendor / manufacturing / transfer / stock
- `In Transit` — sent via stock transfer, not yet received
- `Buildable` — assemblable bundles based on component stock
- `Unreserved` = On Hand minus Reserved

Status badges (exception alerts, not enum fields):
- `Negative stock`
- `Not enough stock`
- `Available to build`

### Serialization
inFlow tracks serial numbers across movement history (purchase → sale). **No per-unit status field.** Status is implicit — serial is "in inventory" or "assigned to transaction." Traceability only.

---

## Fishbowl (Advanced)

### Axis 1 — Part Lifecycle Status
Field: **Active** (checkbox on Part record)
- Active = checkbox checked
- Inactive = checkbox unchecked

Binary, not an enum. No Deprecated/Archived/Discontinued.

### Axis 2 — Inventory Quantity Concepts
Fields (exact labels from wiki/blog):
- `On Hand` — total parts currently in stock
- `Available for Sale` = On Hand + Drop Ship - Allocated - Not Available
- `Allocated` — assigned to sales/purchase/transfer/work orders
- `Committed` — picked for an order, not yet shipped or used in work order
- `Not Available` — not ready/able to be sold (quality hold equivalent)
- `Drop Ship` — in process of drop-shipping to customer from third party
- `On Order` — on a purchase/sales/work/transfer order

**Key differentiator:** Fishbowl has an explicit `Not Available` concept — closest thing to a quality/hold axis among these 5.

### Serialization
Full serialization support. Fishbowl assigns serial numbers at receiving and requires serial selection at picking (cannot proceed without selecting a serial). **No per-unit status field** as a discrete enum — status derived from which order/location the serial is assigned to.

---

## Katana MRP

### Axis 1 — Product Lifecycle Status
No confirmed product lifecycle status field (Active/Inactive/Deprecated). Katana's docs focus on stock levels and manufacturing orders — no evidence of a product-level on/off switch comparable to inFlow or Zoho.

### Axis 2 — Stock Quantity Concepts
Fields (exact labels from Stock screen docs):
- `In stock` — physically available in warehouse
- `Committed` — allocated to open sales orders, manufacturing orders, outsourced POs
- `Expected` — incoming from open POs, MOs, or outsourced POs
- `Safety stock level` — replenishment threshold
- `Calculated stock` — derived metric

Sales item availability status (per-order-line, not per-item):
- `In stock` — enough available to fulfill SO
- `Expected` — not in stock but open MO/PO/OPO covers it
- `Not available` — insufficient stock, no open order covering gap
- `Not applicable` — service item (non-physical, always available)

Manufacturing order production statuses (separate axis):
Source: help.katanamrp.com (docs reference MO statuses as a distinct set)

### Serialization
Katana supports serial number and batch tracking across purchase orders and manufacturing. Confirmable per docs. **No per-unit serial status field** documented — traceability/lot tracking focus, not discrete unit statuses.

### Third Axis (Manufacturing)
Katana is the only one of the 5 with a prominent **manufacturing axis**: Manufacturing Order (MO) production statuses exist as a third distinct axis. This is irrelevant for Loon but worth noting as a model for "operation status" separate from "stock status."

---

## Zoho Inventory

### Axis 1 — Item Lifecycle Status
Field: **Status** (item record)
- `Active` — available for transactions
- `Inactive` — cannot be added to new transactions; historical records preserved

Note: Only two confirmed values. No Deprecated/Archived tier.

### Axis 2 — Serial Number Status (per-unit)
Field: **Status** on individual serial number record
- `IN` — serial number is available in warehouse (received, not yet sold)
- `OUT` — serial number has been sold or negatively adjusted

**Key differentiator:** Zoho is the ONLY one of the 5 with an explicit, documented per-unit serial status enum. Two values only (IN/OUT) — no intermediate states (no "Reserved," "In Transit," "On Hold," "QC").

Zoho also distinguishes two stock tracking methods:
- `Accounting Stock` — increases with Bills, decreases with Invoices
- `Physical Stock` — increases with Purchase Receives, decreases with Shipments

---

## Synthesis: Cleanest Model for Loon

**Zoho Inventory** has the most relevant building block but exposes the gap Loon must fill.

Zoho is the only competitor with an explicit per-unit serial status (IN/OUT) — which proves the concept is productizable and useful. But IN/OUT is too coarse for Loon's warehouse workflow: it collapses "arrived and in QC," "cleared and on shelf," "picked for order," and "in transit to another location" all into a single IN state. That's the seam.

Fishbowl's `Not Available` quantity concept is the other useful signal — it acknowledges a quality-hold or hold state at the stock level, even if it's not a per-unit enum.

**Recommendation for Loon's status model (two-axis):**
- Axis 1 (Ownership): `Active` | `Inactive` | `Retired` — matches SMB mental model; "Retired" > "Deprecated" for non-technical users
- Axis 2 (Physical/Location state): `In Receiving` | `In Storage` | `On Hold` | `Picked` | `In Transit` | `Departed` — explicit per-unit enum that NO competitor models cleanly at the individual serialized asset level

See [[asset-status-model]] for the adopted Loon status model decisions.
