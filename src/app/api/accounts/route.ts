import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  accounts,
  debtors,
  users,
  bankClients,
  complianceFlags,
} from "@/db/schema";
import { eq, ilike, or, and, sql, desc, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") ?? "priority";
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(accounts.skipTraceStatus, status as "pending" | "in_progress" | "located" | "unresolved" | "closed"));
    }

    if (search) {
      conditions.push(
        or(
          ilike(debtors.firstName, `%${search}%`),
          ilike(debtors.lastName, `%${search}%`),
          ilike(accounts.accountNumber, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderCol =
      sort === "balance"
        ? desc(sql`CAST(${accounts.balance} AS NUMERIC)`)
        : sort === "daysNoContact"
        ? desc(accounts.daysNoContact)
        : sort === "updatedAt"
        ? desc(accounts.updatedAt)
        : asc(accounts.priority);

    const rows = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.accountNumber,
        balance: accounts.balance,
        skipTraceStatus: accounts.skipTraceStatus,
        failedCallAttempts: accounts.failedCallAttempts,
        mailReturned: accounts.mailReturned,
        emailBounced: accounts.emailBounced,
        daysNoContact: accounts.daysNoContact,
        priority: accounts.priority,
        chargeOffDate: accounts.chargeOffDate,
        lastTraceDate: accounts.lastTraceDate,
        updatedAt: accounts.updatedAt,
        debtorId: debtors.id,
        debtorFirstName: debtors.firstName,
        debtorLastName: debtors.lastName,
        debtorDob: debtors.dob,
        debtorSsnLast4: debtors.ssnLast4,
        agentFirstName: users.firstName,
        agentLastName: users.lastName,
        bankName: bankClients.name,
        bankCode: bankClients.code,
        hasComplianceFlag: sql<boolean>`EXISTS (
          SELECT 1 FROM compliance_flags cf
          WHERE cf.account_id = ${accounts.id}
          AND cf.is_active = true
        )`,
      })
      .from(accounts)
      .innerJoin(debtors, eq(accounts.debtorId, debtors.id))
      .leftJoin(users, eq(accounts.assignedAgentId, users.id))
      .innerJoin(bankClients, eq(accounts.bankClientId, bankClients.id))
      .where(whereClause)
      .orderBy(orderCol)
      .limit(limit)
      .offset(offset);

    // Total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(accounts)
      .innerJoin(debtors, eq(accounts.debtorId, debtors.id))
      .where(whereClause);

    return NextResponse.json({ accounts: rows, total: Number(total), page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
