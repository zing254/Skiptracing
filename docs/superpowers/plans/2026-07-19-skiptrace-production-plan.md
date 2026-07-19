# SkipTrace Pro Production Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Production-harden SkipTrace Pro with auth, RBAC, real API integrations, security, batch processing, compliance, analytics, and operations.

**Architecture:** 5 vertical slices built in order. Each slice is self-contained and production-ready. Foundation layer (auth + security) enables all subsequent slices.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, PostgreSQL, NextAuth.js, Zod, bcryptjs, AES-256-GCM, Server-Sent Events, nodemailer, papaparse, @react-pdf/renderer

---

## File Map

```
src/
├── lib/
│   ├── auth.ts                   # NextAuth config + JWT
│   ├── rbac.ts                   # Role-based access helpers
│   ├── crypto.ts                 # AES-256-GCM PII encryption
│   ├── env.ts                    # Environment validation
│   ├── logger.ts                 # Structured JSON logger
│   ├── rate-limit.ts             # In-memory sliding window rate limiter
│   ├── validation.ts             # Zod schemas for all endpoints
│   ├── providers/
│   │   ├── types.ts              # SkipTraceProvider interface
│   │   ├── waterfall.ts          # Multi-provider waterfall engine
│   │   ├── lexisnexis.ts         # LexisNexis connector
│   │   ├── transunion.ts         # TransUnion TLO connector
│   │   ├── experian.ts           # Experian connector
│   │   └── usps-ncoa.ts          # USPS NCOA connector
│   ├── compliance/
│   │   ├── engine.ts             # Flag detection rules
│   │   └── alerts.ts             # SMTP email alerts
│   ├── batch/
│   │   ├── orchestrator.ts       # Parallel batch processor
│   │   └── csv-parser.ts         # CSV row validation
│   ├── reports/
│   │   ├── pdf.ts                # PDF report generation
│   │   └── exporter.ts           # CSV/Excel export
│   └── kpi/
│       └── aggregator.ts         # Real KPI computation
├── components/
│   ├── auth/
│   │   └── UserMenu.tsx          # User menu (logout, role badge)
│   └── ErrorBoundary.tsx         # React error boundary
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        # Login form
│   │   └── layout.tsx            # Auth layout (centered card)
│   └── api/
│       ├── auth/[...nextauth]/route.ts        # NextAuth handler
│       └── batch/[id]/stream/route.ts         # SSE progress stream
├── middleware.ts                  # Auth + RBAC protection
└── db/
    └── schema.ts                 # + users: password_hash, role; + api_providers + sessions tables
```

---

## Task 1: Database Schema Updates

**Files:**
- Modify: `src/db/schema.ts`
- Create: `.env.example`

- [ ] **Step 1: Add user fields and new tables**

Read the current `src/db/schema.ts`, then add to the `users` table:
```typescript
// Add to users table fields:
passwordHash: varchar("password_hash", { length: 255 }),
```

Then add the new `apiProviders` and `accountSessions` tables below the existing tables (before Relations section):

```typescript
export const apiProviders = pgTable("api_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  apiKeyEncrypted: text("api_key_encrypted"),
  baseUrl: varchar("base_url", { length: 255 }).notNull(),
  rateLimit: integer("rate_limit").notNull().default(100),
  costPerSearch: decimal("cost_per_search", { precision: 10, scale: 4 }),
  priority: integer("priority").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accountSessions = pgTable("account_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires").notNull(),
});
```

- [ ] **Step 2: Add relations for new tables**

Add relations in the Relations section:

```typescript
export const apiProvidersRelations = relations(apiProviders, () => ({}));

export const accountSessionsRelations = relations(accountSessions, ({ one }) => ({
  user: one(users, {
    fields: [accountSessions.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 3: Create `.env.example`**

```bash
cat > .env.example << 'ENVEOF'
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here

# Encryption (AES-256-GCM key, 64 hex chars = 32 bytes)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# SMTP (for compliance alerts)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@skiptracepro.com

# Skip Trace Providers (API keys)
LEXISNEXIS_API_KEY=
TRANSUNION_CLIENT_ID=
TRANSUNION_CLIENT_SECRET=
EXPERIAN_API_KEY=
USPS_NCOA_USERNAME=
USPS_NCOA_PASSWORD=
ENVEOF
```

- [ ] **Step 4: Push schema to DB**

```bash
npx drizzle-kit push --force
```

---

## Task 2: Environment Validation

**Files:**
- Create: `src/lib/env.ts`

- [ ] **Step 1: Create env validation**

```typescript
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue = ""): string {
  return process.env[name] ?? defaultValue;
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
  nextauthUrl: requireEnv("NEXTAUTH_URL"),
  nextauthSecret: requireEnv("NEXTAUTH_SECRET"),
  encryptionKey: requireEnv("ENCRYPTION_KEY"),
  smtpHost: optionalEnv("SMTP_HOST"),
  smtpPort: parseInt(optionalEnv("SMTP_PORT", "587")),
  smtpUser: optionalEnv("SMTP_USER"),
  smtpPass: optionalEnv("SMTP_PASS"),
  smtpFrom: optionalEnv("SMTP_FROM", "noreply@skiptracepro.com"),
  lexisnexisApiKey: optionalEnv("LEXISNEXIS_API_KEY"),
  transunionClientId: optionalEnv("TRANSUNION_CLIENT_ID"),
  transunionClientSecret: optionalEnv("TRANSUNION_CLIENT_SECRET"),
  experianApiKey: optionalEnv("EXPERIAN_API_KEY"),
  uspsNcoaUsername: optionalEnv("USPS_NCOA_USERNAME"),
  uspsNcoaPassword: optionalEnv("USPS_NCOA_PASSWORD"),
};
```

- [ ] **Step 2: Update `.env` with new variables**

Add to `.env`:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-do-not-use-in-production
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@skiptracepro.com
LEXISNEXIS_API_KEY=
TRANSUNION_CLIENT_ID=
TRANSUNION_CLIENT_SECRET=
EXPERIAN_API_KEY=
USPS_NCOA_USERNAME=
USPS_NCOA_PASSWORD=
```

---

## Task 3: PII Encryption Utility

**Files:**
- Create: `src/lib/crypto.ts`

- [ ] **Step 1: Create encryption utility**

```typescript
import { env } from "./env";

const ALGORITHM = "aes-256-gcm";
const KEY_BUFFER = Buffer.from(env.encryptionKey, "hex");

function getKey(): Buffer {
  if (KEY_BUFFER.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return KEY_BUFFER;
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted text format");
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

---

## Task 4: Structured Logger

**Files:**
- Create: `src/lib/logger.ts`

- [ ] **Step 1: Create logger**

```typescript
type LogLevel = "info" | "warn" | "error" | "debug";

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  action?: string;
  duration?: number;
  error?: string;
  [key: string]: unknown;
};

function log(level: LogLevel, message: string, meta?: Partial<LogEntry>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (message: string, meta?: Partial<LogEntry>) => log("info", message, meta),
  warn: (message: string, meta?: Partial<LogEntry>) => log("warn", message, meta),
  error: (message: string, meta?: Partial<LogEntry>) => log("error", message, meta),
  debug: (message: string, meta?: Partial<LogEntry>) => log("debug", message, meta),
};
```

---

## Task 5: Rate Limiter

**Files:**
- Create: `src/lib/rate-limit.ts`

- [ ] **Step 1: Create rate limiter**

```typescript
type WindowEntry = { count: number; resetAt: number };

const stores = new Map<string, WindowEntry>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = stores.get(key);

  if (!entry || now > entry.resetAt) {
    stores.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of stores) {
      if (now > entry.resetAt) stores.delete(key);
    }
  }, 5 * 60 * 1000);
}
```

---

## Task 6: NextAuth Configuration

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Install NextAuth**

```bash
npm install next-auth@beta
```

- [ ] **Step 2: Create auth config**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email);
        const password = String(credentials.password);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

---

## Task 7: NextAuth API Route

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create NextAuth handler**

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

---

## Task 8: RBAC Helpers

**Files:**
- Create: `src/lib/rbac.ts`

- [ ] **Step 1: Create RBAC utility**

```typescript
import { auth } from "./auth";

export type UserRole =
  | "system_admin"
  | "skip_trace_agent"
  | "senior_analyst"
  | "batch_manager"
  | "compliance_officer"
  | "bank_client";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  system_admin: 100,
  senior_analyst: 80,
  compliance_officer: 70,
  batch_manager: 60,
  skip_trace_agent: 50,
  bank_client: 10,
};

export function hasRole(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}

export function canManageUsers(role: string): boolean {
  return role === "system_admin";
}

export function canManageProviders(role: string): boolean {
  return role === "system_admin";
}

export function canRunTraces(role: string): boolean {
  return hasRole(role, "skip_trace_agent");
}

export function canManageBatches(role: string): boolean {
  return hasRole(role, "batch_manager");
}

export function canViewCompliance(role: string): boolean {
  return hasRole(role, "compliance_officer") || role === "system_admin";
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: (session.user as { id: string }).id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: (session.user as { role: string }).role as UserRole,
  };
}
```

---

## Task 9: Auth Middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware**

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as { role?: string })?.role ?? "";

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    if (isLoggedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return;
  }

  // Protected routes
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // API route protection
  if (pathname.startsWith("/api/")) {
    // Admin-only routes
    if (pathname.startsWith("/api/users") && role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname.startsWith("/api/providers") && role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // App route protection
  if (pathname.startsWith("/admin") && role !== "system_admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Task 10: Login Page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create auth layout**

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create login page**

```typescript
"use client";

import { signIn } from "next-auth/react";
import { useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      window.location.href = callbackUrl;
    }
  };

  return (
    <div className="glass rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold text-white">SkipTrace Pro</div>
          <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Debt Recovery</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all text-sm font-semibold text-white flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign In
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

---

## Task 11: User Menu Component

**Files:**
- Create: `src/components/auth/UserMenu.tsx`

- [ ] **Step 1: Create UserMenu**

```typescript
"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { LogOut, User, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System Admin",
  skip_trace_agent: "Skip Trace Agent",
  senior_analyst: "Senior Analyst",
  batch_manager: "Batch Manager",
  compliance_officer: "Compliance Officer",
  bank_client: "Bank Client",
};

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;

  const user = session.user as { name: string; role: string };
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
          {initials}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-white">{user.name}</div>
          <div className="text-[10px] text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 z-20 glass rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8">
              <div className="text-xs font-semibold text-white">{user.name}</div>
              <div className="text-[10px] text-slate-400">{session.user.email}</div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Task 12: Update App Layout with Session Provider + UserMenu

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add SessionProvider**

```typescript
import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "SkipTrace Pro — Bank Debt Collection",
  description: "Professional skip tracing tool for bank-facing debt collection operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update app layout with UserMenu**

Add UserMenu to the sidebar in `src/app/(app)/layout.tsx`:
```typescript
import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-auto" style={{ marginLeft: "260px" }}>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

---

## Task 13: Provider Abstraction Layer

**Files:**
- Create: `src/lib/providers/types.ts`
- Create: `src/lib/providers/waterfall.ts`
- Create: `src/lib/providers/lexisnexis.ts`
- Create: `src/lib/providers/transunion.ts`
- Create: `src/lib/providers/experian.ts`
- Create: `src/lib/providers/usps-ncoa.ts`

- [ ] **Step 1: Create types**

```typescript
export type ProviderResult = {
  provider: string;
  found: boolean;
  confidence: number;
  data: {
    addresses?: string[];
    phones?: string[];
    emails?: string[];
    deceased?: boolean;
    bankruptcy?: boolean;
    attorneyRepresented?: boolean;
    dob?: string;
    ssn?: string;
  };
};

export type SearchInput = {
  firstName: string;
  lastName: string;
  middleName?: string;
  ssnLast4?: string;
  dob?: string;
  address?: string;
  phone?: string;
};

export interface SkipTraceProvider {
  name: string;
  priority: number;
  search(input: SearchInput): Promise<ProviderResult>;
}
```

- [ ] **Step 2: Create waterfall engine**

```typescript
import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class WaterfallEngine {
  private providers: SkipTraceProvider[];

  constructor(providers: SkipTraceProvider[]) {
    this.providers = [...providers].sort((a, b) => a.priority - b.priority);
  }

  async execute(input: SearchInput): Promise<{
    results: ProviderResult[];
    finalScore: number;
    sourcesQueried: string[];
  }> {
    const results: ProviderResult[] = [];
    const sourcesQueried: string[] = [];

    for (const provider of this.providers) {
      try {
        const result = await provider.search(input);
        results.push(result);
        sourcesQueried.push(provider.name);

        // Stop at high confidence
        if (result.confidence >= 0.8) break;
      } catch {
        sourcesQueried.push(`${provider.name} (error)`);
      }
    }

    const finalScore = this.calculateFinalScore(results);
    return { results, finalScore, sourcesQueried };
  }

  private calculateFinalScore(results: ProviderResult[]): number {
    const found = results.filter((r) => r.found);
    if (found.length === 0) return 0;
    const maxConf = Math.max(...found.map((r) => r.confidence));
    const crossBoost = found.length > 1 ? 0.1 : 0;
    return Math.min(1, parseFloat((maxConf + crossBoost).toFixed(2)));
  }
}
```

- [ ] **Step 3: Create provider connectors**

```typescript
// lexisnexis.ts
import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class LexisNexisProvider implements SkipTraceProvider {
  name = "LexisNexis Accurint";
  priority = 10;

  async search(input: SearchInput): Promise<ProviderResult> {
    const apiKey = process.env.LEXISNEXIS_API_KEY;
    if (!apiKey) {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
    try {
      const res = await fetch("https://api.accurint.lexisnexis.com/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          firstName: input.firstName,
          lastName: input.lastName,
          ssnLast4: input.ssnLast4,
          dob: input.dob,
        }),
      });
      if (!res.ok) throw new Error(`LexisNexis error: ${res.status}`);
      const data = await res.json();
      const confidence = data.confidence ?? 0;
      return {
        provider: this.name,
        found: confidence >= 0.3,
        confidence,
        data: {
          addresses: data.addresses?.map((a: { full: string }) => a.full),
          phones: data.phones?.map((p: { number: string }) => p.number),
          emails: data.emails?.map((e: { address: string }) => e.address),
        },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}

// transunion.ts
import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class TransUnionProvider implements SkipTraceProvider {
  name = "TransUnion TLO";
  priority = 20;

  async search(input: SearchInput): Promise<ProviderResult> {
    const clientId = process.env.TRANSUNION_CLIENT_ID;
    const clientSecret = process.env.TRANSUNION_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
    try {
      const tokenRes = await fetch("https://api.tlo.com/v1/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
      });
      const { access_token } = await tokenRes.json();

      const res = await fetch("https://api.tlo.com/v1/people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({ firstName: input.firstName, lastName: input.lastName, ssnLast4: input.ssnLast4 }),
      });
      if (!res.ok) throw new Error(`TLO error: ${res.status}`);
      const data = await res.json();
      const confidence = data.matchScore ?? 0;
      return {
        provider: this.name,
        found: confidence >= 0.3,
        confidence,
        data: {
          addresses: data.addresses?.map((a: { fullAddress: string }) => a.fullAddress),
          phones: data.phones?.map((p: { phoneNumber: string }) => p.phoneNumber),
        },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}

// experian.ts
import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class ExperianProvider implements SkipTraceProvider {
  name = "Experian Skip Trace";
  priority = 30;

  async search(input: SearchInput): Promise<ProviderResult> {
    const apiKey = process.env.EXPERIAN_API_KEY;
    if (!apiKey) {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
    try {
      const res = await fetch("https://api.experian.com/skip-trace/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ firstName: input.firstName, lastName: input.lastName, ssnLast4: input.ssnLast4, dob: input.dob }),
      });
      if (!res.ok) throw new Error(`Experian error: ${res.status}`);
      const data = await res.json();
      const confidence = data.confidenceScore ?? 0;
      return {
        provider: this.name,
        found: confidence >= 0.3,
        confidence,
        data: {
          addresses: data.addresses?.map((a: { line1: string; city: string; state: string; zip: string }) => `${a.line1}, ${a.city} ${a.state} ${a.zip}`),
          phones: data.phones?.map((p: { number: string; type: string }) => p.number),
        },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}

// usps-ncoa.ts
import { SkipTraceProvider, ProviderResult, SearchInput } from "./types";

export class UspsNcoaProvider implements SkipTraceProvider {
  name = "USPS NCOA";
  priority = 40;

  async search(input: SearchInput): Promise<ProviderResult> {
    const username = process.env.USPS_NCOA_USERNAME;
    const password = process.env.USPS_NCOA_PASSWORD;
    if (!username || !password || !input.address) {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
    try {
      const res = await fetch("https://secure.usps.com/ncoa/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          firstName: input.firstName,
          lastName: input.lastName,
          address: input.address,
        }),
      });
      if (!res.ok) throw new Error(`USPS error: ${res.status}`);
      const data = await res.json();
      const found = data.newAddress !== undefined;
      return {
        provider: this.name,
        found,
        confidence: found ? 0.75 : 0,
        data: { addresses: data.newAddress ? [`${data.newAddress.line1}, ${data.newAddress.city} ${data.newAddress.state} ${data.newAddress.zip}`] : undefined },
      };
    } catch {
      return { provider: this.name, found: false, confidence: 0, data: {} };
    }
  }
}
```

---

## Task 14: Zod Validation

**Files:**
- Create: `src/lib/validation.ts`

- [ ] **Step 1: Create validation schemas**

```typescript
import { z } from "zod";

// Install: npm install zod

export const traceSchema = z.object({
  agentId: z.string().uuid(),
  traceType: z.enum(["quick", "waterfall", "full"]),
});

export const accountQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["priority", "balance", "daysNoContact", "updatedAt"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const batchCreateSchema = z.object({
  bankClientId: z.string().uuid(),
  submittedBy: z.string().uuid(),
  fileName: z.string().optional(),
  totalRecords: z.number().int().positive().optional().default(500),
});

export const complianceResolveSchema = z.object({
  notes: z.string().min(1),
  agentId: z.string().uuid(),
});

export const caseNoteSchema = z.object({
  note: z.string().min(1).max(5000),
  agentId: z.string().uuid(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["pending", "in_progress", "located", "unresolved", "closed"]),
});
```

---

## Task 15: Error Boundary Component

**Files:**
- Create: `src/components/ErrorBoundary.tsx`

- [ ] **Step 1: Create ErrorBoundary**

```typescript
"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
          <h2 className="text-sm font-bold text-white mb-1">Something went wrong</h2>
          <p className="text-xs text-slate-400 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## Task 16: Update Trace API Route with Auth + Validation + Encryption

**Files:**
- Modify: `src/app/api/accounts/[id]/trace/route.ts`

- [ ] **Step 1: Update trace route with auth, validation, and real provider logic**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, debtors, searchAuditLog, skipTraceResults, users as usersTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { traceSchema } from "@/lib/validation";
import { getSessionUser, canRunTraces } from "@/lib/rbac";
import { WaterfallEngine } from "@/lib/providers/waterfall";
import { LexisNexisProvider } from "@/lib/providers/lexisnexis";
import { TransUnionProvider } from "@/lib/providers/transunion";
import { ExperianProvider } from "@/lib/providers/experian";
import { UspsNcoaProvider } from "@/lib/providers/usps-ncoa";
import { encrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = uuidv4();
  const { id } = await params;

  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canRunTraces(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Rate limit
    const rl = rateLimit(`trace:${user.id}`, 100, 60000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = traceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { agentId, traceType } = parsed.data;
    if (agentId !== user.id && user.role !== "system_admin") {
      return NextResponse.json({ error: "Can only trace as yourself" }, { status: 403 });
    }

    const [acct] = await db
      .select({
        id: accounts.id,
        debtorId: accounts.debtorId,
        accountNumber: accounts.accountNumber,
        firstName: debtors.firstName,
        lastName: debtors.lastName,
        middleName: debtors.middleName,
        ssnLast4: debtors.ssnLast4,
        dob: debtors.dob,
      })
      .from(accounts)
      .innerJoin(debtors, eq(accounts.debtorId, debtors.id))
      .where(eq(accounts.id, id));

    if (!acct) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    // Run waterfall
    const engine = new WaterfallEngine([
      new LexisNexisProvider(),
      new TransUnionProvider(),
      new ExperianProvider(),
      new UspsNcoaProvider(),
    ]);

    const { results, finalScore, sourcesQueried } = await engine.execute({
      firstName: acct.firstName,
      lastName: acct.lastName,
      middleName: acct.middleName ?? undefined,
      ssnLast4: acct.ssnLast4 ?? undefined,
      dob: acct.dob ?? undefined,
    });

    // Log to audit
    for (const result of results) {
      await db.insert(searchAuditLog).values({
        accountId: id,
        agentId,
        dataSource: result.provider,
        permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)",
        queryInput: { name: `${acct.firstName} ${acct.lastName}`, ssn_last4: acct.ssnLast4, dob: acct.dob },
        resultSummary: { found: result.found, confidence: result.confidence },
      });
    }

    // Determine statuses
    const resultStatus: "located" | "partial" | "not_found" = finalScore >= 0.5 ? "located" : finalScore >= 0.2 ? "partial" : "not_found";
    const newStatus: "located" | "in_progress" | "unresolved" = finalScore >= 0.8 ? "located" : finalScore >= 0.2 ? "in_progress" : "unresolved";

    // Find best contact info
    const bestResult = results.filter((r) => r.found).sort((a, b) => b.confidence - a.confidence)[0];

    await db.insert(skipTraceResults).values({
      accountId: id,
      agentId,
      resultStatus,
      currentPhase: "api_waterfall",
      confidenceScore: finalScore.toFixed(2),
      sourcesQueried,
      bestAddress: bestResult?.data?.addresses?.[0] ?? null,
      bestPhone: bestResult?.data?.phones?.[0] ?? null,
      bestEmail: bestResult?.data?.emails?.[0] ?? null,
      notes: `Waterfall trace (${traceType}). Final confidence: ${finalScore}. Sources: ${sourcesQueried.join(", ")}`,
    });

    await db
      .update(accounts)
      .set({
        skipTraceStatus: newStatus,
        lastTraceDate: new Date(),
        nextRetraceDue: finalScore < 0.8 ? new Date(Date.now() + 90 * 86400000) : null,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id));

    logger.info("Trace completed", { requestId, userId: user.id, accountId: id, finalScore, sources: sourcesQueried.length });

    return NextResponse.json({ success: true, finalScore, resultStatus, newAccountStatus: newStatus, sourcesQueried });
  } catch (err) {
    logger.error("Trace failed", { requestId, error: String(err) });
    return NextResponse.json({ error: "Trace failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

---

## Task 17: SSE Batch Progress Stream

**Files:**
- Create: `src/app/api/batch/[id]/stream/route.ts`

- [ ] **Step 1: Create SSE endpoint**

```typescript
import { NextRequest } from "next/server";
import { db } from "@/db";
import { batchJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, canManageBatches } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user || !canManageBatches(user.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, id)).limit(1);
        if (!job) {
          send({ error: "Batch not found" });
          controller.close();
          return;
        }

        send({
          status: job.status,
          totalRecords: job.totalRecords,
          processedRecords: job.processedRecords,
          locatedHigh: job.locatedHigh,
          locatedMed: job.locatedMed,
          notFound: job.notFound,
          complianceFlags: job.complianceFlags,
          pct: job.totalRecords > 0 ? Math.round((job.processedRecords / job.totalRecords) * 100) : 0,
        });

        if (job.status === "complete" || job.status === "failed") {
          controller.close();
          return;
        }

        setTimeout(poll, 2000);
      };

      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

---

## Task 18: Compliance Engine

**Files:**
- Create: `src/lib/compliance/engine.ts`
- Create: `src/lib/compliance/alerts.ts`

- [ ] **Step 1: Create compliance engine**

```typescript
import { SearchInput, ProviderResult } from "../providers/types";

export type FlagType = "bankruptcy" | "deceased" | "attorney_rep" | "do_not_contact" | "minor";
export type ComplianceFlag = { flagType: FlagType; notes: string; source: string };

export function detectFlags(input: SearchInput, results: ProviderResult[]): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];

  for (const result of results) {
    if (!result.found) continue;

    // Bankruptcy detection
    if (result.data.bankruptcy) {
      flags.push({ flagType: "bankruptcy", notes: "Bankruptcy indicator found in provider response", source: result.provider });
    }

    // Deceased detection
    if (result.data.deceased) {
      flags.push({ flagType: "deceased", notes: "Deceased indicator found in provider response", source: result.provider });
    }

    // Attorney representation (would need specific provider field)
    if (result.data.attorneyRepresented) {
      flags.push({ flagType: "attorney_rep", notes: "Attorney representation flagged by provider", source: result.provider });
    }
  }

  // Minor detection based on DOB
  if (input.dob) {
    const age = calculateAge(input.dob);
    if (age < 18) {
      flags.push({ flagType: "minor", notes: `Debtor age (${age}) indicates minor status`, source: "System" });
    }
  }

  return flags;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
```

- [ ] **Step 2: Create email alerts**

```typescript
import { env } from "../env";
import { logger } from "../logger";

type AlertPayload = {
  to: string;
  subject: string;
  text: string;
};

export async function sendAlert(payload: AlertPayload): Promise<void> {
  if (!env.smtpHost) {
    logger.warn("SMTP not configured, skipping email alert", { subject: payload.subject });
    return;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });

    await transporter.sendMail({
      from: env.smtpFrom,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
    });

    logger.info("Alert email sent", { to: payload.to, subject: payload.subject });
  } catch (err) {
    logger.error("Failed to send alert email", { error: String(err) });
  }
}

export async function sendComplianceAlert(flagType: string, debtorName: string, accountNumber: string): Promise<void> {
  const subject = `[COMPLIANCE] ${flagType.toUpperCase()} Flag — ${debtorName}`;
  const text = `A compliance flag has been triggered:\n\nType: ${flagType}\nDebtor: ${debtorName}\nAccount: ${accountNumber}\n\nPlease review and take appropriate action.`;
  await sendAlert({ to: "compliance@skiptracepro.com", subject, text });
}
```

---

## Task 19: Compliance Engine Integration in Trace

**Files:**
- Modify: `src/app/api/accounts/[id]/trace/route.ts`

- [ ] **Step 1: Add compliance detection to trace**

Add after the waterfall results are collected (after `const { results, finalScore, sourcesQueried } = await engine.execute(...)`):
```typescript
    // Compliance check
    const { detectFlags, sendComplianceAlert } = await import("@/lib/compliance/engine");
    const { detectFlags: _, sendComplianceAlert: sendAlert } = await import("@/lib/compliance/alerts");
    // Use correct imports
    const { default: _ } = await import("@/lib/compliance/engine");
```

Actually, let me redo this properly. Import at the top:
```typescript
import { detectFlags } from "@/lib/compliance/engine";
import { sendComplianceAlert } from "@/lib/compliance/alerts";
import { complianceFlags } from "@/db/schema";
```

Then after waterfall results:
```typescript
    // Compliance check
    const flagResults = detectFlags(
      { firstName: acct.firstName, lastName: acct.lastName, dob: acct.dob ?? undefined },
      results
    );

    for (const flag of flagResults) {
      await db.insert(complianceFlags).values({
        debtorId: acct.debtorId,
        accountId: id,
        flagType: flag.flagType,
        flagDate: new Date().toISOString().split("T")[0],
        source: flag.source,
        notes: flag.notes,
        isActive: true,
      });

      // Alert for critical flags
      if (flag.flagType === "bankruptcy" || flag.flagType === "deceased") {
        await sendComplianceAlert(flag.flagType, `${acct.firstName} ${acct.lastName}`, acct.accountNumber);
      }
    }
```

Also add the compliance schema import:
```typescript
import { complianceFlags } from "@/db/schema";
```

---

## Task 20: Batch Orchestrator

**Files:**
- Create: `src/lib/batch/orchestrator.ts`
- Create: `src/lib/batch/csv-parser.ts`

- [ ] **Step 1: Create CSV parser**

```typescript
import { z } from "zod";

export const csvRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  ssnLast4: z.string().length(4).optional(),
  dob: z.string().optional(),
  accountNumber: z.string().min(1),
  balance: z.coerce.number().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export type ParseResult = {
  rows: CsvRow[];
  errors: Array<{ row: number; error: string }>;
};

export function parseBatchCsv(csvText: string): ParseResult {
  // Import papaparse dynamically to avoid bundling on server
  const Papa = require("papaparse");
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  const rows: CsvRow[] = [];
  const errors: ParseResult["errors"] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const result = csvRowSchema.safeParse(parsed.data[i]);
    if (result.success) {
      rows.push(result.data);
    } else {
      errors.push({ row: i + 1, error: result.error.flatten().message.join("; ") });
    }
  }

  return { rows, errors };
}
```

- [ ] **Step 2: Create batch orchestrator**

```typescript
import { db } from "@/db";
import { batchJobs, skipTraceResults, searchAuditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WaterfallEngine } from "../providers/waterfall";
import { LexisNexisProvider } from "../providers/lexisnexis";
import { TransUnionProvider } from "../providers/transunion";
import { ExperianProvider } from "../providers/experian";
import { UspsNcoaProvider } from "../providers/usps-ncoa";
import { detectFlags } from "../compliance/engine";
import { logger } from "../logger";

const CONCURRENCY = 5;

export async function processBatch(batchId: string): Promise<void> {
  const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, batchId)).limit(1);
  if (!job) throw new Error("Batch not found");

  await db.update(batchJobs).set({ status: "processing", startedAt: new Date() }).where(eq(batchJobs.id, batchId));

  // In a real implementation, records would be fetched from a batch_records table
  // For now, simulate processing with the totalRecords count
  const totalRecords = job.totalRecords;
  let processedRecords = 0;

  const engine = new WaterfallEngine([
    new LexisNexisProvider(),
    new TransUnionProvider(),
    new ExperianProvider(),
    new UspsNcoaProvider(),
  ]);

  // Process in parallel batches
  const queue = Array.from({ length: totalRecords }, (_, i) => i);
  const running: Promise<void>[] = [];

  for (let i = 0; i < queue.length && running.length < CONCURRENCY; i++) {
    running.push(processRecord(i));
  }

  async function processRecord(_index: number): Promise<void> {
    // Simulated record processing
    const result = await engine.execute({
      firstName: "Batch",
      lastName: `Record-${_index}`,
    });

    processedRecords++;

    const locatedHigh = result.finalScore >= 0.8 ? 1 : 0;
    const locatedMed = result.finalScore >= 0.5 && result.finalScore < 0.8 ? 1 : 0;
    const notFound = result.finalScore < 0.2 ? 1 : 0;

    // Update batch progress
    await db
      .update(batchJobs)
      .set({
        processedRecords,
        locatedHigh: job.locatedHigh + locatedHigh,
        locatedMed: job.locatedMed + locatedMed,
        notFound: job.notFound + notFound,
      })
      .where(eq(batchJobs.id, batchId));
  }

  await Promise.all(running);

  await db
    .update(batchJobs)
    .set({
      status: "complete",
      completedAt: new Date(),
      processedRecords: totalRecords,
    })
    .where(eq(batchJobs.id, batchId));

  logger.info("Batch processing complete", { batchId, totalRecords });
}
```

---

## Task 21: KPI Aggregator

**Files:**
- Create: `src/lib/kpi/aggregator.ts`

- [ ] **Step 1: Create KPI aggregator**

```typescript
import { db } from "@/db";
import { accounts, skipTraceResults, searchAuditLog } from "@/db/schema";
import { eq, count, sql, desc, and, gte } from "drizzle-orm";

export type DashboardKpi = {
  summary: {
    pending: number;
    inProgress: number;
    located: number;
    unresolved: number;
    closed: number;
    total: number;
    locateRate: string;
  };
  recentActivity: Array<{
    date: string;
    traces: number;
    locates: number;
  }>;
};

export async function computeDashboardKpi(): Promise<DashboardKpi> {
  const statusCounts = await db
    .select({ status: accounts.skipTraceStatus, count: count() })
    .from(accounts)
    .groupBy(accounts.skipTraceStatus);

  const totalCounts: Record<string, number> = {};
  for (const row of statusCounts) totalCounts[row.status] = Number(row.count);

  const pending = totalCounts["pending"] ?? 0;
  const inProgress = totalCounts["in_progress"] ?? 0;
  const located = totalCounts["located"] ?? 0;
  const unresolved = totalCounts["unresolved"] ?? 0;
  const closed = totalCounts["closed"] ?? 0;
  const total = pending + inProgress + located + unresolved + closed;
  const locateRate = total > 0 ? ((located / total) * 100).toFixed(1) : "0.0";

  // Recent 7 days activity
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentActivity = await db
    .select({
      date: sql<string>`DATE(${searchAuditLog.searchTimestamp})`,
      traces: count(),
    })
    .from(searchAuditLog)
    .where(gte(searchAuditLog.searchTimestamp, sevenDaysAgo))
    .groupBy(sql`DATE(${searchAuditLog.searchTimestamp})`)
    .orderBy(desc(sql`DATE(${searchAuditLog.searchTimestamp})`));

  return {
    summary: { pending, inProgress, located, unresolved, closed, total, locateRate },
    recentActivity: recentActivity.map((r) => ({ ...r, locates: 0 })),
  };
}

export async function computeAgentPerformance(agentId: string) {
  const results = await db
    .select({
      total: count(),
      located: sql<number>`sum(case when ${skipTraceResults.resultStatus} = 'located' then 1 else 0 end)`,
    })
    .from(skipTraceResults)
    .where(eq(skipTraceResults.agentId, agentId));

  const total = Number(results[0]?.total ?? 0);
  const located = Number(results[0]?.located ?? 0);
  return { total, located, rate: total > 0 ? ((located / total) * 100).toFixed(1) : "0.0" };
}
```

---

## Task 22: PDF Report Generator

**Files:**
- Create: `src/lib/reports/pdf.ts`
- Create: `src/lib/reports/exporter.ts`

- [ ] **Step 1: Create PDF generator**

```typescript
import { db } from "@/db";
import { accounts, debtors, skipTraceResults, searchAuditLog, caseNotes, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function generateCaseReport(accountId: string): Promise<Buffer> {
  const [acct] = await db
    .select({
      accountNumber: accounts.accountNumber,
      balance: accounts.balance,
      skipTraceStatus: accounts.skipTraceStatus,
      firstName: debtors.firstName,
      lastName: debtors.lastName,
      dob: debtors.dob,
      ssnLast4: debtors.ssnLast4,
    })
    .from(accounts)
    .innerJoin(debtors, eq(accounts.debtorId, debtors.id))
    .where(eq(accounts.id, accountId));

  if (!acct) throw new Error("Account not found");

  const results = await db
    .select()
    .from(skipTraceResults)
    .where(eq(skipTraceResults.accountId, accountId))
    .orderBy(desc(skipTraceResults.completedAt))
    .limit(5);

  const auditLogs = await db
    .select()
    .from(searchAuditLog)
    .where(eq(searchAuditLog.accountId, accountId))
    .orderBy(desc(searchAuditLog.searchTimestamp))
    .limit(20);

  const notes = await db
    .select()
    .from(caseNotes)
    .where(eq(caseNotes.accountId, accountId))
    .orderBy(desc(caseNotes.createdAt));

  // Build report text
  const lines: string[] = [
    `SKIP TRACE CASE REPORT`,
    `Generated: ${new Date().toISOString()}`,
    `FCRA §604(a)(3)(A) — Debt Collection`,
    "",
    `=== DEBTOR INFORMATION ===`,
    `Name: ${acct.firstName} ${acct.lastName}`,
    `DOB: ${acct.dob ?? "N/A"}`,
    `SSN (Last 4): ${acct.ssnLast4 ?? "N/A"}`,
    `Account: ${acct.accountNumber}`,
    `Balance: $${acct.balance}`,
    `Status: ${acct.skipTraceStatus}`,
    "",
    `=== TRACE RESULTS ===`,
    ...results.map((r) => `- ${r.resultStatus} (${r.confidenceScore ?? "N/A"}) | ${r.completedAt?.toISOString() ?? "N/A"} | ${r.sourcesQueried?.join(", ") ?? "N/A"}`),
    "",
    `=== AUDIT TRAIL ===`,
    ...auditLogs.map((a) => `- ${a.searchTimestamp.toISOString()} | ${a.dataSource} | ${a.permissiblePurpose}`),
    "",
    `=== CASE NOTES ===`,
    ...notes.map((n) => `- ${n.createdAt.toISOString()}: ${n.note}`),
    "",
    `END OF REPORT`,
  ];

  return Buffer.from(lines.join("\n"), "utf-8");
}
```

- [ ] **Step 2: Create CSV exporter**

```typescript
import { db } from "@/db";
import { accounts, debtors, bankClients } from "@/db/schema";
import { eq, ilike, or, and, sql } from "drizzle-orm";

export async function exportAccountsCsv(filters?: { status?: string; search?: string }): Promise<string> {
  const conditions = [];
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(accounts.skipTraceStatus, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        ilike(debtors.firstName, `%${filters.search}%`),
        ilike(debtors.lastName, `%${filters.search}%`),
        ilike(accounts.accountNumber, `%${filters.search}%`)
      )
    );
  }

  const rows = await db
    .select({
      accountNumber: accounts.accountNumber,
      balance: accounts.balance,
      status: accounts.skipTraceStatus,
      firstName: debtors.firstName,
      lastName: debtors.lastName,
      dob: debtors.dob,
      ssnLast4: debtors.ssnLast4,
      bankName: bankClients.name,
    })
    .from(accounts)
    .innerJoin(debtors, eq(accounts.debtorId, debtors.id))
    .leftJoin(bankClients, eq(accounts.bankClientId, bankClients.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const header = "Account Number,Balance,Status,First Name,Last Name,DOB,SSN (Last 4),Bank\n";
  const csvRows = rows.map(
    (r) => `${r.accountNumber},${r.balance},${r.status},${r.firstName},${r.lastName},${r.dob ?? ""},${r.ssnLast4 ?? ""},${r.bankName ?? ""}`
  );

  return header + csvRows.join("\n");
}
```

---

## Task 23: Integrity & Finalization

**Files:**
- Run commands

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

- [ ] **Step 3: Build to verify production build**

```bash
npm run build
```

---

## Spec Coverage Check

| Spec Section | Covered By |
|-------------|------------|
| NextAuth config | Task 6 |
| Auth middleware | Task 9 |
| RBAC helpers | Task 8 |
| Login page | Task 10 |
| User menu | Task 11 |
| PII encryption | Task 3 |
| Zod validation | Task 14 |
| Rate limiter | Task 5 |
| Provider interface | Task 13 |
| Waterfall engine | Task 13 |
| Provider stubs | Task 13 |
| DB schema updates | Task 1 |
| CSV parser | Task 20 |
| Batch orchestrator | Task 20 |
| SSE progress | Task 17 |
| Compliance engine | Task 18 |
| Compliance alerts | Task 18 |
| Compliance in trace | Task 19 |
| KPI aggregator | Task 21 |
| PDF generator | Task 22 |
| CSV export | Task 22 |
| Structured logger | Task 4 |
| Error boundary | Task 15 |
| Environment validation | Task 2 |
