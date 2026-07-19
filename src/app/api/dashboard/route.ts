import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, complianceFlags, batchJobs, kpiSnapshots, users } from "@/db/schema";
import { eq, count, sql, desc, and, gte } from "drizzle-orm";
import { getSessionUser } from "@/lib/rbac";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Status counts
    const statusCounts = await db
      .select({
        status: accounts.skipTraceStatus,
        count: count(),
      })
      .from(accounts)
      .groupBy(accounts.skipTraceStatus);

    // Recent compliance flags (active)
    const recentFlags = await db
      .select({
        id: complianceFlags.id,
        flagType: complianceFlags.flagType,
        flagDate: complianceFlags.flagDate,
        notes: complianceFlags.notes,
        accountId: complianceFlags.accountId,
      })
      .from(complianceFlags)
      .where(eq(complianceFlags.isActive, true))
      .orderBy(desc(complianceFlags.createdAt))
      .limit(5);

    // Active batch jobs
    const activeBatches = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.status, "processing"))
      .limit(3);

    // KPI trend (last 14 days)
    const kpiTrend = await db
      .select()
      .from(kpiSnapshots)
      .orderBy(desc(kpiSnapshots.snapshotDate))
      .limit(14);

    // Top agents
    const topAgents = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        located: sql<number>`count(case when ${accounts.skipTraceStatus} = 'located' then 1 end)`,
        inProgress: sql<number>`count(case when ${accounts.skipTraceStatus} = 'in_progress' then 1 end)`,
        total: count(),
      })
      .from(users)
      .leftJoin(accounts, eq(accounts.assignedAgentId, users.id))
      .groupBy(users.id, users.firstName, users.lastName, users.role)
      .having(sql`count(${accounts.id}) > 0`)
      .orderBy(sql`count(case when ${accounts.skipTraceStatus} = 'located' then 1 end) desc`)
      .limit(5);

    // Summary stats
    const totalCounts: Record<string, number> = {};
    for (const row of statusCounts) {
      totalCounts[row.status] = Number(row.count);
    }

    const pending = totalCounts["pending"] ?? 0;
    const inProgress = totalCounts["in_progress"] ?? 0;
    const located = totalCounts["located"] ?? 0;
    const unresolved = totalCounts["unresolved"] ?? 0;
    const closed = totalCounts["closed"] ?? 0;
    const total = pending + inProgress + located + unresolved + closed;
    const locateRate = total > 0 ? ((located / total) * 100).toFixed(1) : "0.0";

    return NextResponse.json({
      summary: { pending, inProgress, located, unresolved, closed, total, locateRate },
      recentFlags,
      activeBatches,
      kpiTrend: kpiTrend.reverse(),
      topAgents,
    });
  } catch (err) {
    logger.error("Failed to load dashboard", { error: String(err) });
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
