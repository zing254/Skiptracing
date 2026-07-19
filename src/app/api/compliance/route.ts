import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  complianceFlags,
  debtors,
  accounts,
  bankClients,
} from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getSessionUser, canViewCompliance } from "@/lib/rbac";
import { logger } from "@/lib/logger";

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canViewCompliance(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const flags = await db
      .select({
        id: complianceFlags.id,
        flagType: complianceFlags.flagType,
        flagDate: complianceFlags.flagDate,
        source: complianceFlags.source,
        notes: complianceFlags.notes,
        isActive: complianceFlags.isActive,
        resolvedAt: complianceFlags.resolvedAt,
        createdAt: complianceFlags.createdAt,
        debtorFirst: debtors.firstName,
        debtorLast: debtors.lastName,
        debtorDob: debtors.dob,
        accountNumber: accounts.accountNumber,
        accountId: accounts.id,
        bankName: bankClients.name,
      })
      .from(complianceFlags)
      .leftJoin(debtors, eq(complianceFlags.debtorId, debtors.id))
      .leftJoin(accounts, eq(complianceFlags.accountId, accounts.id))
      .leftJoin(bankClients, eq(accounts.bankClientId, bankClients.id))
      .orderBy(desc(complianceFlags.createdAt));

    // Summary counts by type
    const typeCounts = await db
      .select({
        flagType: complianceFlags.flagType,
        count: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${complianceFlags.isActive} = true then 1 else 0 end)`,
      })
      .from(complianceFlags)
      .groupBy(complianceFlags.flagType);

    return NextResponse.json({ flags, typeCounts });
  } catch (err) {
    logger.error("Failed to fetch compliance flags", { error: String(err) });
    return NextResponse.json({ error: "Failed to fetch compliance flags" }, { status: 500 });
  }
}
