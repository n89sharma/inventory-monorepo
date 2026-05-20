---
name: feedback-no-disposition-term
description: Never recommend "Disposition" as the name for the inventory status field — warehouse operators don't use that term
metadata:
  type: feedback
---

Never use the term "Disposition" to name the per-unit lifecycle/ownership status field in Loon (or in any recommendation to warehouse operators).

**Why:** "Disposition" is an academic/legal/procurement term — it does not appear in warehouse operator vocabulary. The user (who has warehouse domain expertise) explicitly rejected it. The correct term is **Inventory Status** (or just "Status" in UI labels), with DB column name `inventory_status`. This correction was made on 2026-05-20 after the term was used in the asset status model design.

**How to apply:** Any time you are naming or labeling the field that carries an asset's lifecycle state (Available, On Order, In QC, Sold, etc.), call it "Inventory Status" or "Status" — never "Disposition," "Ownership Status," or any other synonym that doesn't map to how a warehouse GM or receiving clerk would say it out loud.
