---
name: ux-hold-info-in-search
description: Design decision for surfacing hold details (who holds an asset) in the Search page table without adding columns
metadata:
  type: project
---

Hold info in the Search page table should be surfaced via a **hover/focus popover anchored to the Status badge cell**, not as columns, not as row expansion, not as a side drawer.

**Decision rationale:**
- `AssetSearchRow` already carries `hold_number` (nullable). Hold number is enough to construct a link.
- The full hold detail (created_for, customer org, dates) requires a separate API call — not in the row payload.
- The user's actual question is "who holds this asset?" — that resolves to: the org name (`customer`) and the person responsible (`created_for`). Not a full record dump.
- The Status badge is already the natural anchor: only "held" assets need this popover; status = 'HELD' gates the interaction.
- Hover/focus popover pattern (GitHub's hovercard, Linear's issue detail tooltip) is zero extra clicks for the primary use case (read-only lookup). Click through to hold detail page is one click for the secondary use case (navigate to hold).
- Row expansion was rejected because: it adds vertical bulk to every row interaction, the hold context is secondary data not primary scannable data, and the existing table already has horizontal overflow pressure.
- Side drawer was rejected because: it implies the user wants to take action on the hold, not just read who has it; it covers the table; it adds a close target.
- Adding hold columns was explicitly rejected by the user due to horizontal overflow.
- Column visibility toggle was rejected as too cumbersome.

**What the popover should contain:**
- Hold number (as a link to `/holds/:holdNumber`) — one line
- Customer org name — one line
- Held-for user (created_for) — one line
- Hold dates if present (from_dt / to_dt) — one line, muted
- No close button; dismiss on pointer-out/focus-out

**Data requirement flag:**
`AssetSearchRow` currently only has `hold_number`. The popover needs `customer` (org name) and `created_for` (user name) — these are NOT in the current schema. Two options: (a) extend `AssetSearchRowSchema` with nullable hold summary fields, or (b) fetch hold detail on hover by hold_number. Option (a) is strongly preferred — no extra round-trip, no skeleton flash, and the data is cheap (2 strings). Flag for engineering.

**Why:** Rejected alternatives documented above. Ratified 2026-05-27.

**How to apply:** When any future feature wants to surface secondary entity context in a table without adding columns, the hover/focus popover anchored to a status or identity cell is the default pattern to reach for first.
