# Memory Index

- [Filter bar pattern for collection pages](ux_filter_bar_pattern.md) — Sticky header, inline horizontal, Quick Search presets inline and auto-fire; SearchBar box wrapper removed
- [Asset status fields — two-field model and visual hierarchy](ux_asset_status_fields.md) — Two fields ratified; Ownership (primary pill) + Location (muted text, same cell); badge default-case color bug noted
- [Meter range filter on Search page](ux_meter_range_filter.md) — Two side-by-side InputWithClearInline boxes in w-45 slot; popover/combined-input/slider all rejected
- [Search page minimum-criteria gate](ux_search_minimum_criteria.md) — Explicit Search button (not auto-fire); disabled+tooltip before criteria met; guided empty state; result-cap inline banner above table
- [Hold info in Search table](ux_hold_info_in_search.md) — Hover/focus popover on Status badge (not columns, not row expansion, not drawer); needs AssetSearchRow schema extension for org+user name fields
- [Lifecycle event statuses — Arrival/Transfer/Departure](ux_lifecycle_event_statuses.md) — Draft→Confirmed→Completed only (Cancelled/Reopen/IN_TRANSIT all deferred); outlined-ring badge variant; single primary transition button; list filter unchanged (no hiding Completed); Arrival uses Expected Assets (OrderedAsset) for receive workflow; ratified 2026-05-29
- [Search → Asset Details → back navigation pattern](ux_search_back_navigation.md) — sessionStorage back-URL + hash scroll-to-row; history.back() rejected; breadcrumb "← Search results" with ArrowLeft when filter state exists; selection discarded on return
