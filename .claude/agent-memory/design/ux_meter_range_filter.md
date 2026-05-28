---
name: ux-meter-range-filter
description: Design decision for meter range filter on the Search page — two side-by-side inputs replacing a single input
metadata:
  type: project
---

Meter filter on Search page: replaced single `meter: number | null` with two inputs — `meterMin` and `meterMax` — side by side within the existing `w-45` slot.

**Why:** Users need precise large number ranges (e.g. 50,000–100,000 page counts). Single input can only express one bound. Slider ruled out by product owner (too imprecise for large numbers). Combined "from–to" text input rejected (parsing fragile, keyboard UX poor). Popover rejected (adds click overhead, breaks consistency with rest of inline filter bar).

**Pattern reference:** Stripe amount filter, Shopify price facet, Amazon price range — all use two side-by-side inline boxes. This is the universal ERP/e-commerce convention for precise numeric ranges.

**How to apply:**
- Two `InputWithClearInline` instances at ~`w-22` each, wrapped in `flex flex-row gap-1 items-end` inside a `w-45` container
- Placeholders: "Meter min" and "Meter max" (sentence case, matching existing toolbar placeholders)
- Each fires `updateDraftDebounced` independently — no change to debounce pattern
- Only-min and only-max are both valid states; backend applies each bound only if present
- Min > max: do not block with client-side validation; let backend return empty results naturally
- Each input has its own × clear button via existing `InputWithClearInline` pattern
- URL params: `PARAM_METER` → `PARAM_METER_MIN` + `PARAM_METER_MAX` (breaking change for existing bookmarks — low stakes)
- `SearchFilters` type: `meter: number | null` → `meterMin: number | null`, `meterMax: number | null`
- Backend query changes from equality to `>= meterMin AND <= meterMax` — requires backend change

**Rejected alternatives:** popover (extra click), combined "50000–100000" text input (fragile parsing, bad keyboard UX), slider (product owner ruled out), presets-only (too coarse for precision needs; may add as supplement later).

**Open future iteration:** Preset chips ("< 50K", "50K–100K", "100K+") that populate both boxes — additive, does not change primary pattern.
