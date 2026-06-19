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
  standalone, behavior-preserving commit — verify it builds/works — *then* make functional changes.
  Always present the rename as a separate step. Never mix renames with logic changes in one commit.

## Plan format

Write plans in this structure, always: **Context** (why), **Architectural decisions & risks**,
numbered implementation sections **split Backend / Frontend with `###` subheadings**, **Out of
scope**, **Verification**. Put a blank line between every bullet, and use subheadings within any
long section. Optimize for scannability.

## Commands

Run from the **repo root** after every code change; summarize and fix any errors before
considering the task complete:
```bash
npm run bbuild   # build backend only
npm run fbuild   # build shared-types then frontend
```
Per-app (run inside the app dir): `npm run dev` (backend: tsx watch; frontend: Vite on 5173).
Backend also: `npm run pgen` (`prisma generate --sql`) after any `.sql` change.

**No test runner is configured.** Do not invent or run `npm test`.

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

- **Line length < 100.** Wrap signatures one param per line, return type on its own line;
  wrap long object args (e.g. Prisma queries) when the single line exceeds 100.
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
