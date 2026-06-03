# Shared types — `packages/shared-types/`

The API contract: plain data that crosses the network, and the single source of truth for entity
shapes. **Most features start here** — a schema change propagates to backend validation and
frontend form validation. Loads when you work in this tree.

- **One file per entity** in `types/`: `hold-types.ts`, `invoice-types.ts`, `departure-types.ts`, …
- **Types are inferred from Zod via `z.infer<>`** — no hand-written interfaces.
- **Reference data** (statuses, warehouses, invoice types, roles, …) lives in
  `reference-data-types.ts`.
- **All exports flow through `index.ts`.** Always import from `'shared-types'` — this is an
  intentional package API boundary, not an intra-app barrel. Do not refactor to deep imports.
- For each create/update form: `CreateXyzSchema` + `CreateXyz` live here; the matching
  `XyzFormSchema` + `XyzForm` (form-only state) live in the frontend's `ui-types/`. If a shape
  only exists inside a form, it does **not** belong here — see `apps/frontend/CLAUDE.md`.
