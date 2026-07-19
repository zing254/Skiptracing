# SkipTrace Pro — Agent Guide

## Stack
- Next.js 16 (App Router), React 19, TypeScript 5.9, Tailwind CSS 4
- Drizzle ORM 0.45 + PostgreSQL, NextAuth.js v5 (credentials + JWT)
- No test framework; no test command exists

## Commands (run in repo root)
```
npm run dev          # dev server
npm run build        # production build (typecheck + compile)
npm run lint         # eslint .
npm run typecheck    # tsc --noEmit
```
Verification order: `typecheck -> lint -> build` (no tests exist).

## Database
- PostgreSQL container at `127.0.0.1:5432`, db `osint`, user `osint`, pass `osint`
- Schema: `src/db/schema.ts` — push changes with `npx drizzle-kit push --force`
- Seed: `npx tsx src/db/seed.ts` (imports `dotenv/config` internally)
- DB client exported from `@/db` (`drizzle(pool)` with node-postgres `Pool`)

## Paths
- `@/*` → `src/*` (configured in tsconfig paths)
- `@/db` → `src/db/index.ts`

## Required Env Vars (checked at module load in `src/lib/env.ts`)
```
DATABASE_URL=postgresql://osint:osint@127.0.0.1:5432/osint
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-do-not-use-in-production
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```
Missing any of these crashes the build. SMTP and provider API keys are optional.

## Auth
- NextAuth credentials provider in `src/lib/auth.ts`; handler at `src/app/api/auth/[...nextauth]/route.ts`
- Proxy at `src/proxy.ts` — protects all routes except `/login` and `/api/auth`
- Session: JWT strategy, user `role` stored in token
- RBAC helpers in `src/lib/rbac.ts` — use `getSessionUser()`, `canRunTraces()`, etc.
- Login: `/login` with `useSearchParams` — wrapped in Suspense boundary
- Seeded dev password: `password123` for all users (e.g. `jdavis@skiptrace.com`)

## Architecture
- **Providers**: `src/lib/providers/` — `SkipTraceProvider` interface, `WaterfallEngine`, 4 connectors (LexisNexis, TransUnion, Experian, USPS NCOA)
- **Compliance**: `src/lib/compliance/engine.ts` — flag detection; `alerts.ts` — SMTP email
- **Batch**: `src/lib/batch/orchestrator.ts` + `csv-parser.ts`
- **KPI**: `src/lib/kpi/aggregator.ts` — real DB queries for dashboard
- **Reports**: `src/lib/reports/pdf.ts` + `exporter.ts` — plaintext PDF / CSV export
- **Encryption**: `src/lib/crypto.ts` — AES-256-GCM
- **Rate limiting**: `src/lib/rate-limit.ts` — in-memory sliding window
- **Validation**: `src/lib/validation.ts` — Zod schemas
- **Logging**: `src/lib/logger.ts` — structured JSON to stdout
- **Config**: `drizzle.config.json` encodes the DB connection. `next.config.ts` is minimal.
- Key API routes: `api/accounts/[id]/trace` (POST), `api/batch/[id]/stream` (GET, SSE)

## Conventions
- `"use client"` on interactive components; Server Components by default
- `clsx` for conditional classes; `lucide-react` for icons; `recharts` for charts
- Sidebar defined in `src/components/Sidebar.tsx` with `UserMenu` nested inside
- Zod schemas used in API routes via `.safeParse()` — never cast request bodies
- No barrel exports — prefer direct imports from module files
