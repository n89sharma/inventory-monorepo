# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Loon** is a lightweight inventory management system for small businesses to track assets in real-time. It is a TypeScript monorepo using npm workspaces with:
- `apps/backend` — Express.js REST API with Prisma + PostgreSQL
- `apps/frontend` — React 19 SPA with Vite
- `packages/shared-types` — Shared Zod schemas and TypeScript types

## Commands

All commands are run from within each app directory unless noted.

### Backend (`apps/backend`)
```bash
npm run dev      # tsx watch (hot reload)
npm run build    # tsc
npm run start    # node dist/src/index.js
npm run bs       # build then start
npm run prisma   # npx prisma generate --sql
```

### Frontend (`apps/frontend`)
```bash
npm run dev      # Vite dev server (port 5173)
npm run build    # tsc -b && vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

No tests are configured yet.

### Root-level build commands
```bash
npm run bbuild   # Build backend only (from repo root)
npm run fbuild   # Build shared-types then frontend (from repo root)
```

## Development Workflow

**Before making any changes to project files, always load these two skills:**
1. `/vercel-react-best-practices`
2. `/vercel-composition-patterns`

### Guard Component Pattern
When the same conditional render shape — show children or show a fallback — appears more than once, extract it into a **Guard Component** rather than repeating inline ternaries. A Guard Component takes a `condition: boolean`, a `fallback: string` (or `ReactNode`), and `children: ReactNode`. It renders children when the condition is met, and the fallback otherwise.

This pattern mirrors how React's `Suspense` works and is the idiomatic alternative to repeating `{condition ? <content /> : <p>No data</p>}` across a page.

**Important JSX caveat:** children props are evaluated eagerly before the component renders. Use `?.` optional chaining inside children (not `!` non-null assertions) to avoid runtime errors when the guarded value is null.

Reference implementation: `apps/frontend/src/components/custom/asset-details/optional-section.tsx`

**After every code change, run both build commands from the repo root:**
```bash
npm run bbuild
npm run fbuild
```
Then summarize any errors and fix them before considering the task complete.

## Architecture

### Data Flow
```
Frontend (React + Zustand + Axios)
  → Backend REST API (Express on port 3000)
  → Prisma ORM
  → PostgreSQL
```

### Shared Types Package
`packages/shared-types` contains Zod schemas used on **both** backend (validation) and frontend (form validation + type inference). Types are inferred from Zod schemas via `z.infer<>`. This is the single source of truth for entity shapes.

### Backend Structure (`apps/backend/src/`)
- `index.ts` — Express server setup, CORS, middleware registration
- `routes/` — Route definitions per entity
- `controllers/` — Business logic per entity
- `middleware/` — Validation middleware
- `prisma.ts` — Shared Prisma client instance

CORS allows `http://localhost:5173` (dev) and `https://shiva-inv.vercel.app` (prod). Backend uses ESM (`"type": "module"`, `moduleResolution: nodenext`).

### Frontend Structure (`apps/frontend/src/`)
- `data/api/` — Axios API clients, one file per entity
- `data/store/` — Zustand stores, one file per entity
- `components/pages/` — Summary (list) and Detail pages per entity
- `components/modals/` — Modal dialogs for create/edit actions
- `components/layout/` — MainLayout and navigation
- `components/shadcn/` — shadcn/ui components (do not edit these directly)
- `components/custom/` — Custom reusable UI components
- `hooks/` — Custom React hooks
- `lib/` — Utility functions

Path alias `@/` maps to `src/`.

### State Management Pattern
- **Global/server state:** Zustand stores per entity (`data/store/`)
- **Form state:** React Hook Form + Zod resolver (`@hookform/resolvers/zod`)
- **No React Query** — data fetching is done inside Zustand store actions

### UI Stack
- **TailwindCSS v4** via `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- **shadcn/ui** + **Radix UI** primitives for components
- **Phosphor Icons** for icons
- **TanStack React Table** for data tables

### Core Domain Entities
- **Asset** — core inventory item (barcode, model, status)
- **Arrival** — assets received from supplier
- **Departure** — assets sent to customer
- **Transfer** — assets moved between warehouses
- **Hold** — assets reserved for a customer
- **Invoice** — purchase/sales invoices
- **Organization** — suppliers, customers, transporters
- **Warehouse** — storage locations
- Reference data: Model, Brand, AssetType

### Prisma Notes
- Schema at `apps/backend/prisma/schema.prisma`
- Generated client output: `apps/backend/generated/prisma`
- Preview features: `relationJoins`, `typedSql`
- Config file: `apps/backend/prisma.config.ts`
