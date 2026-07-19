import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, debtors, searchAuditLog, skipTraceResults, complianceFlags, users as usersTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { traceSchema } from "@/lib/validation";
import { getSessionUser, canRunTraces } from "@/lib/rbac";
import { WaterfallEngine } from "@/lib/providers/waterfall";
import { LexisNexisProvider } from "@/lib/providers/lexisnexis";
import { TransUnionProvider } from "@/lib/providers/transunion";
import { ExperianProvider } from "@/lib/providers/experian";
import { UspsNcoaProvider } from "@/lib/providers/usps-ncoa";
import { detectFlags } from "@/lib/compliance/engine";
import { sendComplianceAlert } from "@/lib/compliance/alerts";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const RETRACE_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const { id } = await params;

  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canRunTraces(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

      if (flag.flagType === "bankruptcy" || flag.flagType === "deceased") {
        await sendComplianceAlert(flag.flagType, `${acct.firstName} ${acct.lastName}`, acct.accountNumber);
      }
    }

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

    const resultStatus: "located" | "partial" | "not_found" = finalScore >= 0.5 ? "located" : finalScore >= 0.2 ? "partial" : "not_found";
    const newStatus: "located" | "in_progress" | "unresolved" = finalScore >= 0.8 ? "located" : finalScore >= 0.2 ? "in_progress" : "unresolved";

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
        nextRetraceDue: finalScore < 0.8 ? new Date(Date.now() + RETRACE_INTERVAL_MS) : null,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id));

    logger.info("Trace completed", { requestId, userId: user.id, accountId: id, finalScore, sources: sourcesQueried.length });

    const response = NextResponse.json({ success: true, finalScore, resultStatus, newAccountStatus: newStatus, sourcesQueried });
    response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
    response.headers.set("X-RateLimit-Reset", String(rl.resetAt));
    return response;
  } catch (err) {
    logger.error("Trace failed", { requestId, error: String(err) });
    return NextResponse.json({ error: "Trace failed" }, { status: 500 });
  }
}
