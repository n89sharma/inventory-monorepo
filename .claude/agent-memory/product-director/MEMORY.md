# Memory Index

- [Competitive Landscape](competitive-landscape.md) — Category definitions (Asset Tracker vs Inventory Specialist), head-to-head vs Cin7/Sortly/Asset Panda/Asset Tiger, strategic positioning
- [Competitor Status Models](competitor-status-models.md) — Two-axis status enums for Cin7/inFlow/Fishbowl/Katana/Zoho: lifecycle status + stock quantity concepts + serialization support
- [SAP and NetSuite Status Models](sap-netsuite-status-models.md) — SAP movement types (101/103/105/107/109), EWM 6-bucket QI model, NetSuite Inbound Shipment statuses + Take Ownership, Incoterms/balance sheet timing, Loon ArrivalStatus adoption
- [Asset Status Model](asset-status-model.md) — Two-axis model: Inventory Status enum + Location (zone enum: Bin/Receiving/Shipping/Tech/InTransit/Unknown + bin_code when zone=Bin) + in_transit boolean; staging zones are first-class peers of bins
- [No "Disposition" term](feedback-no-disposition-term.md) — Never recommend "Disposition" for the inventory status field; warehouse operators don't use that term; use "Inventory Status" / inventory_status
