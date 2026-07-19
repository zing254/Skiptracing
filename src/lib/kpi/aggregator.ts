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
