# SkipTrace Pro — Production Upgrade Design

**Date:** 2026-07-19
**Status:** Approved design, awaiting implementation

## Overview

Production-hardening of SkipTrace Pro, a skip tracing tool for bank debt collection. 5 vertical slices, each fully production-ready before moving to the next.

---

## Slice 1: Core Skip Trace — Auth + Single Search + Real API + Security

### Components

| Component | File | Purpose |
|-----------|------|---------|
| NextAuth config | `src/lib/auth.ts` | Credentials provider, JWT sessions, role in token |
| Auth middleware | `src/middleware.ts` | Protect all `/api/*` and `/(app)/*` routes |
| RBAC helpers | `src/lib/rbac.ts` | Role checks for routes + components |
| Login page | `src/app/(auth)/login/page.tsx` | Email/password login form |
| Register page | `src/app/(auth)/register/page.tsx` | Admin-only user creation |
| User menu | `src/components/auth/UserMenu.tsx` | Profile, logout, role badge |
| PII encryption | `src/lib/crypto.ts` | AES-256-GCM for SSN/DOB at rest |
| Zod validation | `src/lib/validation.ts` | Schemas for every API input |
| Rate limiter | `src/lib/rate-limit.ts` | In-memory sliding window (100 req/min/user) |
| Provider interface | `src/lib/providers/types.ts` | `SkipTraceProvider` abstract interface |
| Waterfall engine | `src/lib/providers/waterfall.ts` | Queries providers in priority, stops at ≥0.80 confidence |
| Provider stubs | `src/lib/providers/*.ts` | Connectors for LexisNexis, TransUnion, Experian, USPS NCOA |
| DB schema updates | `src/db/schema.ts` | Users table: role, password_hash, bank_client_id. New tables: api_providers, sessions |

### Data Flow

```
Login → POST /api/auth/callback/credentials
  → Validate credentials → Create JWT → Redirect to /
  
Trace → POST /api/accounts/[id]/trace
  → Middleware checks auth
  → RBAC: agent must be assigned to account
  → Zod validates body
  → Rate limiter checks quota
  → Waterfall engine queries providers in order
  → Each result logged to audit_log
  → PII encrypted before DB storage
  → Final score calculated → Account status updated
  → Response returned
```

### Security

- Passwords hashed with bcrypt (12 rounds)
- JWT sessions (no database sessions)
- CSRF via NextAuth double-submit cookie
- CSP headers in `next.config.ts`
- Input validation on every endpoint
- Rate limiting per user (in-memory)
- PII encrypted at rest via AES-256-GCM

---

## Slice 2: Batch Processing

### Components

| Component | File | Purpose |
|-----------|------|---------|
| CSV parser | `src/lib/batch/csv-parser.ts` | Parse + Zod-validate each row, header mapping |
| Batch orchestrator | `src/lib/batch/orchestrator.ts` | Configurable concurrency (default 5), per-provider rate limits |
| SSE stream | `src/app/api/batch/[id]/stream/route.ts` | Server-Sent Events for real-time progress |
| Compliance auto-scan | `src/lib/compliance/engine.ts` | Post-trace flag detection |
| Idempotency | DB unique constraint on `(batch_id, record_hash)` | Ensures each record processed once |

### Data Flow

```
POST /api/batch → CSV upload
  → Parse CSV, validate each row
  → Create batch job (status: queued)
  → Orchestrator dequeues job
  → Processes N records in parallel (configurable concurrency)
  → Each record: waterfall trace → compliance scan → store result
  → SSE pushes progress: processed/total, located, flags
  → Batch complete → summary stats computed
  → Agent sees real-time progress in UI
```

### Error Handling

- Individual record failures logged but don't stop batch
- Per-provider rate limiting prevents API throttling
- Exponential backoff retry (3 attempts) on provider failures
- Status: `queued → processing → complete | failed`

---

## Slice 3: Compliance

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Compliance engine | `src/lib/compliance/engine.ts` | Rules-based flag detection from trace results |
| Email alerts | `src/lib/compliance/alerts.ts` | SMTP email to compliance officer on critical flags |
| Resolution workflow | `PATCH /api/compliance/[id]` | Resolve flag with notes, audit trail |
| Compliance dashboard | `src/app/(app)/compliance/page.tsx` | Live view of active flags (already exists, enhanced) |

### Flag Rules

| Flag | Detection Rule |
|------|---------------|
| Bankruptcy | Provider response contains chapter_7/chapter_11/chapter_13, or PACER match |
| Deceased | SSDI match, provider returns deceased status, obituary match |
| Attorney Rep | Provider returns attorney_represented, or letter received |
| Do Not Contact | Debtor request logged, or DNC registry match |
| Minor | DOB indicates under 18, or provider returns minor status |

---

## Slice 4: Analytics & Reporting

### Components

| Component | File | Purpose |
|-----------|------|---------|
| KPI aggregator | `src/lib/kpi/aggregator.ts` | Daily/weekly/monthly metrics from actual trace data |
| PDF generator | `src/lib/reports/pdf.ts` | FCRA-compliant case report PDFs |
| CSV/Excel export | `src/lib/reports/exporter.ts` | Downloadable export of accounts, batches, logs |
| Provider cost tracker | Tracked in `api_providers` table | Cost per locate, hit rates per provider |

### KPI Metrics

- Locate rate (daily, weekly, monthly, by agent, by provider)
- Average confidence score
- Cost per locate (requires real pricing from providers)
- Compliance flag rate
- Agent performance leaderboard
- Batch throughput

---

## Slice 5: Operations

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Structured logger | `src/lib/logger.ts` | JSON-formatted logs with request_id, user_id, action |
| Health endpoint | `GET /api/health` | DB + provider API status + memory |
| Error boundary | `src/components/ErrorBoundary.tsx` | React error boundary per page |
| Environment validation | `src/lib/env.ts` | Validates all required env vars on startup |
| Request tracing | middleware assigns `x-request-id` | Traces through all logs |

---

## Directory Structure Additions

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       └── batch/[id]/stream/route.ts
├── lib/
│   ├── auth.ts
│   ├── rbac.ts
│   ├── crypto.ts
│   ├── env.ts
│   ├── logger.ts
│   ├── rate-limit.ts
│   ├── validation.ts
│   ├── providers/
│   │   ├── types.ts
│   │   ├── lexisnexis.ts
│   │   ├── transunion.ts
│   │   ├── experian.ts
│   │   ├── usps-ncoa.ts
│   │   └── waterfall.ts
│   ├── compliance/
│   │   ├── engine.ts
│   │   └── alerts.ts
│   ├── batch/
│   │   ├── orchestrator.ts
│   │   └── csv-parser.ts
│   ├── reports/
│   │   ├── pdf.ts
│   │   └── exporter.ts
│   └── kpi/
│       └── aggregator.ts
├── components/
│   ├── auth/UserMenu.tsx
│   └── ErrorBoundary.tsx
└── middleware.ts
```

## Dependencies to Add

```
next-auth
bcryptjs
zod
@react-pdf/renderer
nodemailer
papaparse (CSV parsing)
uuid (if not already)
```

## Provider Integration Notes

Each provider connector:
1. Implements `SkipTraceProvider` interface
2. Uses the provider's REST API
3. Reports errors/exceptions up to waterfall engine
4. Respects rate limits (configurable per provider)
5. Logs every query to `search_audit_log`
6. Returns structured `ProviderResult` with confidence score

### User Roles

| Role | Permissions |
|------|------------|
| `system_admin` | Full access, user management, provider config |
| `skip_trace_agent` | Run traces on assigned accounts, view results, case notes |
| `senior_analyst` | Same as agent + run manual investigations, reassign cases |
| `batch_manager` | Upload/manage batches, view all batch results |
| `compliance_officer` | View/resolve compliance flags, view audit log (read-only) |
| `bank_client` | View their bank's accounts only, no trace execution |
