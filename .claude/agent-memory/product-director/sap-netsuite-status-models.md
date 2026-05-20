---
name: sap-netsuite-status-models
description: SAP S/4HANA (MM+EWM) and NetSuite pre-receipt status models — movement types, stock categories, inbound shipment object, Incoterms/balance sheet timing, QI stock
metadata:
  type: project
---

## Research Date
May 2026 — grounded via WebSearch/WebFetch against current SAP Community/Help Portal and Oracle NetSuite docs.

---

## SAP S/4HANA Pre-Receipt State Model

### State is distributed across 3 objects — no single status field
- **EKKO/EKPO** (PO header/line): `EKPO-ELIKZ` = `' '` open, `'X'` delivery complete; `EKPO-WEMNG` = cumulative GR quantity; `EKPO-EGLKZ` = final delivery flag
- **MSEG/MKPF** (material document): movement type + stock category records what happened
- **MMBE stock overview**: current quantity per stock category bucket

### Movement Types (Goods Receipt lifecycle)
| MvT | Name | Stock Category | FI Entry? | Balance Sheet? |
|-----|------|---------------|-----------|----------------|
| 101 | GR for PO | Unrestricted Use | Yes | Yes immediately |
| 102 | Reversal of 101 | — | Yes reversed | Reversed |
| 103 | GR to GR Blocked Stock | GR Blocked (non-valuated) | No | No |
| 104 | Reversal of 103 | — | No | No |
| 105 | Release GR Blocked → Unrestricted | Unrestricted | Yes | Yes at 105 |
| 106 | Reversal of 105 | — | Yes reversed | Reversed |
| 107 | GR to Valuated GR Blocked (in transit) | Valuated GR Blocked | Yes | Yes at 107 (FOB ownership transfer) |
| 108 | Reversal of 107 | — | Yes reversed | Reversed |
| 109 | Release Valuated GR Blocked → Unrestricted | Unrestricted | Yes (reclassification) | Reclassification only |
| 110 | Reversal of 109 | — | Yes reversed | Reversed |

### Key distinction: 103 vs 107
- **103** = dock staging/dispute hold — non-valuated, not on balance sheet. Used when title has NOT transferred.
- **107** = FOB/FCA ownership transfer in transit — valuated, on balance sheet. Used when title transfers at origin.

### SAP EWM Post-GR Stock Types (6 buckets)
- F1: Unrestricted-Use in Putaway (arrived, being put away)
- Q1: Quality Inspection in Putaway (QI gate before binning)
- B1: Blocked in Putaway (flagged bad during putaway)
- F2: Unrestricted-Use Warehouse (binned, available)
- Q2: Quality Inspection Warehouse (in QI bin, usage decision pending)
- B2: Blocked Warehouse (binned but blocked — failed QI or manual hold)

### QI Gate (SAP EWM + QM)
1. Move type 101 → stock lands in Quality Inspection Stock (not unrestricted)
2. QM module creates Inspection Lot
3. Usage Decision: Accept → F1/F2; Reject → B1/B2; Partial → split
4. Putaway to final bin is BLOCKED until usage decision posted
5. Q1 (putaway queue QI) is distinct from Q2 (warehouse bin QI)

---

## NetSuite Pre-Receipt State Model

### Inbound Shipment Object
- Standalone transaction record grouping one or more PO lines expected in one physical shipment
- NOT auto-created — requires manual creation or integration trigger
- Can be created weeks before goods ship (useful for pre-advising)
- `shipmentstatus` field is read-only, system-managed

### Confirmed Status Enum Values
`toBeShipped` → `inTransit` → `partiallyReceived` → `complete` (→ `closed`)

- **toBeShipped**: created, supplier hasn't shipped yet
- **inTransit**: supplier shipped; Receive and Take Ownership buttons become active
- **partiallyReceived**: some items received via Item Receipt
- **complete**: all items received; PO lines update to Received

### Key Fields on Inbound Shipment
`expectedShippingDate`, `actualShippingDate`, `expectedDeliveryDate`, `actualDeliveryDate`, `billOfLading`, `vesselNumber`, `incoterm`, linked PO lines with `quantityExpected`/`quantityReceived`

### Take Ownership Feature
- Optional feature, not on by default
- When triggered: posts a transaction debiting *Inventory in Transit* asset account, crediting *Accounts Payable*
- This is NetSuite's equivalent of SAP move type 107 — balance sheet recognition before physical receipt
- Triggered manually from Inbound Shipment in `inTransit` status

### NetSuite Inventory Status Feature (separate from Inbound Shipment status)
- Custom user-defined statuses (default: `Good`)
- Each status has "Make Inventory Available for Commitment" toggle
- Applied per item/serial — allows QC hold equivalent without system-enforced gate
- No automatic state machine — purely manual classification

### PO Status Values
`Pending Receipt` → `Partially Received` → `Received` (auto-set as items are received)

---

## Incoterms / Balance Sheet Timing

| Incoterm | Title Transfer | SAP Mechanism | NetSuite Mechanism |
|----------|---------------|--------------|-------------------|
| EXW/FCA/FOB | At origin | Move type 107 → Valuated GR Blocked Stock | Take Ownership → Inventory in Transit account |
| CFR/CIF | At origin port | Same as FOB | Same |
| DAP/DDP/CIP | At destination (your dock) | Move type 101 at physical receipt | Item Receipt posting |

---

## Loon's Arrival Status Model (Adopted)

6-state `ArrivalStatus` enum. See [[arrival-status-model]] for full detail.

`ORDERED` → `IN_TRANSIT` → `AT_DOCK` → `IN_RECEIVING` → `IN_QC` → `PUTAWAY`

### Key decisions vs SAP/NetSuite
- **Incoterms ownership flag**: single toggle "Mark as owned when shipped (FOB)" vs "Mark as owned when received" — replaces SAP's move type 107 configuration complexity and NetSuite's Take Ownership setup
- **QC gate**: IN_QC state exists but is opt-in per asset type; no SAP-style Inspection Lot machinery in MVP
- **AT_DOCK**: explicit state for "physically present but not scanned" — SAP has no equivalent; NetSuite has no equivalent; this is Loon's floor-staff clarity win
- **Deferred to v1.1**: CONFIRMED state (supplier acknowledgment), financial Incoterms accounting entries
- **Deferred to v2+**: EWM-style 6-bucket QI state machine, partial putaway tracking per bin
