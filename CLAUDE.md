# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Tone

Be direct and straightforward.
No cheerleading phrases like "that's absolutely right" or "great question."
Tell me when my ideas are flawed, incomplete, or poorly thought through.
Always be professional. Take the tone of a professional in an office.
Focus on practical problems and realistic solutions rather than being overly positive or encouraging.

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
  known antipatterns — and say so. Proceed only after flagging. (Stack-specific antipatterns
  live in the nested files.)
- **Diverge before converging.** For design / product / architecture questions, propose 2–3
  structurally different approaches with tradeoffs before recommending one. Don't clone the
  modal solution from a known product.
- **No fabrication.** Never invent versions, APIs, file contents, benchmarks, or paths.
  Verify by reading the file or the docs. If something is unverified, say so.
- **Competitor claims need a link, always.** Any claim about another product (UI placement, behavior,
  which apps do X) must be verified this session and shown with a working link — never from memory.
  No source, no claim.
- **Output contract.** Terse and direct. No preamble, no restating my request, no summary of
  what you're about to do. Lead with the answer or the diff.
- **Simplest sufficient solution.** No abstraction, config, or generality that wasn't asked for.
- **Inject typed values; never pass a discriminator a helper branches on or rebuilds types from.**
  A shared helper takes caller-built, fully-typed values (e.g. a `Prisma.AssetWhereInput`, an error
  factory, a `data` clause) and runs the generic algorithm over the shared operand type; the caller
  owns entity-specifics. If a helper needs a string key/enum to reconstruct typed objects (computed
  keys, `Pick<…, K>`, `as`), that's the smell — invert it and pass the literal.
- **Rename as its own step.** When a refactor includes a naming change, do the rename first as a
  standalone, behavior-preserving commit — verify it builds/works — _then_ make functional changes.
  Always present the rename as a separate step. Never mix renames with logic changes in one commit.

## Plan format

Write plans in this structure, always: **Context** (why), **Architectural decisions & risks**,
numbered implementation sections **split Backend / Frontend with `###` subheadings**, **Out of
scope**, **Verification**. Put a blank line between every bullet, and use subheadings within any
long section. Optimize for scannability.

## Commits

Don't add meta/attribution trailers to commit messages (e.g. "Generated with Claude",
"Co-Authored-By: Claude"). Write the message as if authored by the developer.

## Commands

Run from the **repo root** after every code change; summarize and fix any errors before
considering the task complete. **Lint first, then knip, then build, then test** — never run a
later stage before the earlier one:

```bash
npm run verify                   # lint + knip + typecheck, all workspaces (the gate; pre-push + CI run this)
npm test                         # full Vitest suite, both workspaces (btest + ftest) — run after verify
# or run stages individually:
npm run tlint                    # lint shared-types (also run for any shared-types change)
npm run blint && npm run bbuild  # backend: lint, then build
npm run flint && npm run fbuild  # frontend: lint, then build (fbuild compiles shared-types first)
npm run knip                     # dead-code check across all workspaces
npm run btest && npm run ftest   # tests: backend (needs Postgres up), then frontend
```

**Under NO CIRCUMSTANCES** leave a code change without running the linter, and never build
without linting first. Zero tolerance: **no errors and no warnings** may remain after a change —
fix them (don't suppress) before the task is complete.

**No code change may introduce dead code** — unused files, exports, types, or dependencies.
Run `npm run knip` after linting and confirm it's clean (exit 0). A new unused export means
either delete it or drop the `export` keyword if it's used only in-file; never leave it dangling.

Per-app (run inside the app dir): `npm run dev` (backend: tsx watch; frontend: Vite on 5173).
Backend also: `npm run pgen` (`prisma generate --sql`) after any `.sql` change.

**Tests:** Vitest (`npm test` per workspace; `vitest` for watch). Backend integration tests run
against the `loon_test` database, never `loon_dev`: `apps/backend/.env.test` sets `DATABASE_URL`,
Vitest `globalSetup` applies migrations to it, and a `setupFiles` guard aborts the run if
`DATABASE_URL` doesn't target `loon_test`. Requires the local Postgres container (`docker compose up -d`).

**Run the tests after every code change** — `npm test` from the repo root runs both workspaces
(`btest` + `ftest`). Same zero-tolerance rule as lint: a change is not complete until the full
suite passes. **Never commit or push with a failing or unrun test.** If a change touches only one
workspace you may run that workspace's suite while iterating, but the full `npm test` must pass
before the task is considered done. Backend tests need the Postgres container up (`docker compose
up -d`); if it isn't running, start it — don't skip the tests.

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
  fight the formatter — the rules below are _semantic_, not layout. **Never run `npm run format`**
  (it's `prettier --write .` across the whole repo): on this Windows checkout (`core.autocrlf=true`,
  no `.gitattributes`) it rewrites ~200 files LF↔CRLF and floods `git status` with phantom changes.
  Format only the files you touched: `npx prettier --write <file>…`.
- **Static values as top-of-file `const`** — never inline magic strings, event names, or
  defaults. One place to change. e.g. `const DEFAULT_ROLE = 'member'`.
- **Constant maps:** `const X = {...} as const satisfies Record<...>` with **no variable
  annotation** (the annotation widens the type and breaks `keyof typeof X`).
- **Branching:** prefer `if/else if` + early returns over ternary chains for multi-branch logic;
  ternaries only for simple binary expressions. (JSX conditional rules: see `apps/frontend/CLAUDE.md`.)
- **Boolean flags name the positive state** — `enabled`, not `disabled`; `included`, not
  `excluded`. Avoid negated names so call sites read `if (x.enabled)` not `if (!x.disabled)`.
- **Name identifiers after the domain entity, not a UI consumer or render behavior.** The thing's
  durable noun outlives how any one screen uses it. `ASSET_TABLE_COLUMNS` not `PICKABLE_COLUMNS`
  (the picker is one consumer of three); `defaultColumn` not `defaultVisible` (anchor to the noun,
  not the transient view state). A name tied to a consumer becomes wrong the moment a second
  consumer appears.
