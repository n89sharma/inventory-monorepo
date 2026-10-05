# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Tone

Be direct and straightforward.
No cheerleading phrases like "that's absolutely right" or "great question."
Tell me when my ideas are flawed, incomplete, or poorly thought through.
Always be professional. Take the tone of a professional in an office.
Focus on practical problems and realistic solutions rather than being overly positive or encouraging.

**Output contract.** Terse and direct. No preamble, no restating my request, no summary of what
you're about to do. Lead with the answer or the diff.

**Explain in plain language.** Answer a technical question in one short paragraph a non-developer
could follow — no jargon, no code identifiers. Name the mechanism, files, or code only if I ask, or
if they change what I should do next. When the turn asks for a change, the diff leads and this rule
doesn't apply.

## Project

**Loon** — lightweight real-time inventory management for small businesses.
TypeScript monorepo (npm workspaces):

- `apps/backend` — Express REST API, Prisma + PostgreSQL
- `apps/frontend` — React 19 SPA, Vite
- `packages/shared-types` — Zod schemas + inferred types (single source of truth for entity shapes)

Detailed conventions live in nested `CLAUDE.md` files and load automatically when
you read files in each tree: `apps/backend/`, `apps/frontend/`, `packages/shared-types/`.
**Schema changes start in `packages/shared-types`** — they propagate to backend and frontend validation.

## How to approach a task

- **Read before writing.** Before adding any component, hook, util, service, or type,
  grep for an existing equivalent and reuse or extend it. Write new code only when nothing
  fits. Duplication is a defect, not a style choice.
- **Challenge the framing.** Treat my technical decisions as proposals, not constraints.
  Before implementing, name any assumption in my request that may be suboptimal — including
  known antipatterns — and say so. Flag it in the same message, then proceed unless the flag
  changes what I asked for. Once I've made an explicit decision, implement it — state any
  remaining concern in one line and move on, don't re-argue. (Stack-specific antipatterns live in
  the nested files.)
- **Diverge before converging.** For design / product / architecture questions, propose 2–3
  structurally different approaches with tradeoffs before recommending one. Don't clone the
  modal solution from a known product. Skip this when the change is mechanical or only one
  approach is viable — say so in a line instead.
- **No fabrication.** Never invent versions, APIs, file contents, benchmarks, or paths.
  Verify by reading the file or the docs. If something is unverified, say so.
- **Competitor claims need a link, always.** Any claim about another product (UI placement, behavior,
  which apps do X) must be verified this session and shown with a working link — never from memory.
  No source, no claim.
- **Simplest sufficient solution.** No abstraction, config, or generality that wasn't asked for,
  and no extra filters, actions, or UI affordances. If scope should expand, ask in one short
  question first.
- **Rename as its own step.** When a refactor includes a naming change, do the rename first as a
  standalone, behavior-preserving commit — verify it builds/works — _then_ make functional changes.
  Always present the rename as a separate step. Never mix renames with logic changes in one commit.

## Plan format

Write plans in this structure, always: **Context**, **Decisions & risks**, numbered implementation
sections **split Backend / Frontend with `###` subheadings**, **Naming review** (only when something
is renamed), **Tests**. No **Out of scope** section — a scope cut is a decision, state it in
**Decisions & risks**. Blank line between every bullet, subheadings within any long section; scannability
over completeness. Nowhere in a plan: full paths, line numbers, or code snippets (the Zod schema in
Shared types is the one exception) — bare file names in the `Name (file-name.ts)` form below are
required.

**Context**: 4-6 short bullets, plain business language a non-developer can follow, no code
identifiers. Don't restate my prompt — state the problem, why it can't be solved today, any
precedent feature, and the goal. Include whatever was settled in conversation _after_ the original
prompt.

**Decisions & risks**: every decision the feature settles — product, UX, workflow, data and
technical alike, one list, business language, no code identifiers. One bullet each, opening with the
decision as a flat statement ("Costs are not reversed."), then a sentence or two of consequence:
what the system won't do and what the user must do instead. Edge cases and failure modes nest as
sub-bullets. A snapshot of what was decided and what scope was cut — not a justification essay. Where
a plausible alternative was rejected, one clause on why, never more.

**Implementation sections** (Shared types, Backend, Frontend): list every affected item first,
details below. Identify each as `Name (file-name.ts)` — entity and bare file name. Name the existing
equivalent each one mirrors, in the same form, so it's evident the established pattern was checked.
Then short bullets for anything non-obvious.

**Shared types**: group the list under **NEW** / **UPDATED** / **DELETED** headings, then each schema
body.

**Backend**: order files along the path of the request — routes, controller, service, database —
marking each inline, `transferController.ts (Updated)`. Under each, sub-bullet every function added,
updated or deleted with a one-line summary that is technical about the mechanism: "removes the asset
from the transfer and sets its location to the origin's shipping & receiving", never "returns a
machine to origin". Name routes and controllers and move on when they hold no business logic. Then,
per function carrying real logic, a numbered pseudocode walkthrough: one short imperative step per
line, guards and their status codes included.

**Frontend**: same shape, ordered along the data path from the user's action inward — page,
component/dialog, api client, mutation hook. Mark a file the plan leans on but doesn't change as
`(nil)`. One line per file on what it does differently; where it passes something new to a shared
component, say what. Never draft dialog copy, layout or styling. Cover input validation, UI/UX
patterns followed, timers and optimistic/undo behaviour, cache invalidation, and the order of the
user's steps.

**Naming review**: every identifier this change renames or introduces where the name is a judgement
call — old name, new name, one clause of why. Omit the section when nothing is renamed; don't pad it.

**Tests**: backend and frontend under separate subheadings, grouped by test file, each case one line
phrased as the behaviour asserted. Then an **E2E** subheading: a flat list of scenarios, each giving
the user's steps then the full expected end state; say when one builds on the previous. Nothing else
— no `npm run verify` / `npm test` reminder, that's standing procedure.

## Commits

Don't add meta/attribution trailers to commit messages (e.g. "Generated with Claude",
"Co-Authored-By: Claude"). Write the message as if authored by the developer.

Write the message to a temp file and use `git commit -F <file>`. Multi-line messages passed
inline through the PowerShell tool leak literal `@` characters.

## Production data

The production connection string is `PRD_URL` in `.notes/database.env`. Never print it, never
commit it.

- **Reads are fine.** Run `SELECT`s freely; set the session read-only first
  (`SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`).
- **Never run an `INSERT`, `UPDATE` or `DELETE` until I've confirmed the `WHERE` clause.** First
  run a `SELECT` with the same predicate, show me the matching row count (and, for a delete, the
  rows that reference it), then wait for my go-ahead. A go-ahead for one statement does not cover
  another.
- **Writes run in one transaction** (`psql -1`) with a check that raises and rolls back when the
  counts differ from the preview.
- **Schema changes are mine.** I apply migrations; you list the DDL and wait.
- After a write, re-read the affected rows read-only and report the result.

## Commands

Run from the **repo root** after every code change. `npm run verify` sequences its own stages;
when running stages by hand, **lint, then knip, then build, then test** — never a later stage
before an earlier one.

```bash
npm run verify                   # lint + knip + typecheck + build, all workspaces (the gate; pre-push + CI run this)
npm test                         # full Vitest suite, both workspaces (btest + ftest) — run after verify
# or run stages individually:
npm run tlint                    # lint shared-types (also run for any shared-types change)
npm run blint && npm run bbuild  # backend: lint, then build
npm run flint && npm run fbuild  # frontend: lint, then build (fbuild compiles shared-types first)
npm run knip                     # dead-code check across all workspaces
npm run btest && npm run ftest   # tests: backend, then frontend
npm run e2e                      # Playwright; starts the frontend itself, backend must be up
```

**Zero tolerance, lint and tests alike:** no errors and no warnings may remain, and no test may be
failing or unrun. Fix them — never suppress, never skip. A change is not complete otherwise, and
never commit or push in that state. While iterating you may run one workspace's suite; the full
`npm test` must pass before the task is done.

**No dead code** — no unused files, exports, types, or dependencies. `npm run knip` must exit 0.
An unused export means delete it, or drop the `export` keyword if it's used only in-file.

**Postgres:** backend tests need the local container — `docker compose up -d`; start it rather
than skipping tests. They run against `loon_test`, never `loon_dev`: `apps/backend/.env.test` sets
`DATABASE_URL`, Vitest `globalSetup` applies migrations to it, and a `setupFiles` guard aborts the
run if `DATABASE_URL` doesn't target `loon_test`.

Per-app (run inside the app dir): `npm run dev` (backend: tsx watch; frontend: Vite on 5173).
Backend also: `npm run pgen` (`prisma generate --sql`) after any `.sql` change.

## Using third-party libraries

**Before writing or changing code that uses any library/framework API** (Clerk, Prisma,
express-rate-limit, Zod, Axios, TanStack, Zustand, SWR, React Router, etc.), check Context7
first — even for APIs you think you know, since versions drift:
`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`.

**Before recommending a NEW library** (not already in `package.json`) — applies to Claude and
every sub-agent — verify in the current session and report:

1. Not deprecated; no unpatched security advisories.
2. Compatible with our installed peer/runtime versions (read `package.json` first).
3. Last release within ~12 months (`https://registry.npmjs.org/<package>` → `time["<latest>"]`).
   For monorepos, check the specific sub-package, not the umbrella repo.
4. Include: latest version + publish date (verified this session), maintenance signal, runtime
   dependency count. A low commit frequency on a mature, complete library is neutral — recency
   is not health. Never claim "actively maintained" without a check performed this session.

A stale or unverified recommendation is worse than none.

## Code style (all TS)

- **Formatting is owned by Prettier** (`.prettierrc`: no semicolons, single quotes, 100-col,
  trailing commas). A husky pre-commit hook formats staged files on commit; don't hand-format or
  fight the formatter — the rules below are _semantic_, not layout. Format only the files you
  touched: `npx prettier --write <file>…`. **Never run Prettier across the whole repo** — on this
  Windows checkout (`core.autocrlf=true`, no `.gitattributes`) it rewrites ~200 files LF↔CRLF and
  floods `git status` with phantom changes.
- **Static values as top-of-file `const`** — never inline magic strings, event names, or
  defaults. One place to change. e.g. `const DEFAULT_ROLE = 'member'`.
- **Constant maps:** `const X = {...} as const satisfies Record<...>` with **no variable
  annotation** (the annotation widens the type and breaks `keyof typeof X`).
- **Branching:** prefer `if/else if` + early returns over ternary chains for multi-branch logic;
  ternaries only for simple binary expressions. (JSX conditional rules: see `apps/frontend/CLAUDE.md`.)
- **Boolean flags name the positive state** — `enabled`, not `disabled`; `included`, not
  `excluded`. Avoid negated names so call sites read `if (x.enabled)` not `if (!x.disabled)`.
- **Comparing a value across time: name the two sides `prevX` / `currX`, and assign both before
  the comparison.** Never compare a bare `ref.current` or an inline expression against an unnamed
  value. A ref holding the earlier value is `prevXRef`. e.g.
  `const prevBrandId = prevBrandIdRef.current` → `prevBrandIdRef.current = currBrandId` →
  `if (prevBrandId !== currBrandId)`.
- **Inject typed values; never pass a discriminator a helper branches on or rebuilds types from.**
  A shared helper takes caller-built, fully-typed values (e.g. a `Prisma.AssetWhereInput`, an error
  factory, a `data` clause) and runs the generic algorithm over the shared operand type; the caller
  owns entity-specifics. If a helper needs a string key/enum to reconstruct typed objects (computed
  keys, `Pick<…, K>`, `as`), that's the smell — invert it and pass the literal.
- **Name identifiers after the domain entity, not a UI consumer or render behavior.** The thing's
  durable noun outlives how any one screen uses it. `ASSET_TABLE_COLUMNS` not `PICKABLE_COLUMNS`
  (the picker is one consumer of three); `defaultColumn` not `defaultVisible` (anchor to the noun,
  not the transient view state). A name tied to a consumer becomes wrong the moment a second
  consumer appears.
