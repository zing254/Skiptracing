import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { searchAuditLog, accounts, debtors, users } from "@/db/schema";
import { eq, desc, ilike, and, gte, lte, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/rbac";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const agentFilter = searchParams.get("agent");
    const sourceFilter = searchParams.get("source");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "25");
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    const rows = await db
      .select({
        id: searchAuditLog.id,
        dataSource: searchAuditLog.dataSource,
        permissiblePurpose: searchAuditLog.permissiblePurpose,
        queryInput: searchAuditLog.queryInput,
        resultSummary: searchAuditLog.resultSummary,
        searchTimestamp: searchAuditLog.searchTimestamp,
        accountNumber: accounts.accountNumber,
        accountId: accounts.id,
        debtorFirst: debtors.firstName,
        debtorLast: debtors.lastName,
        agentFirst: users.firstName,
        agentLast: users.lastName,
        agentRole: users.role,
      })
      .from(searchAuditLog)
      .leftJoin(accounts, eq(searchAuditLog.accountId, accounts.id))
      .leftJoin(debtors, eq(accounts.debtorId, debtors.id))
      .leftJoin(users, eq(searchAuditLog.agentId, users.id))
      .orderBy(desc(searchAuditLog.searchTimestamp))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(searchAuditLog);

    return NextResponse.json({ logs: rows, total: Number(total), page, limit });
  } catch (err) {
    logger.error("Failed to fetch audit log", { error: String(err) });
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
