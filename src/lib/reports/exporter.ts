import { db } from "@/db";
import { accounts, debtors, bankClients } from "@/db/schema";
import { eq, ilike, or, and } from "drizzle-orm";
import { skipTraceStatusEnum } from "@/db/schema";

type SkipTraceStatus = (typeof skipTraceStatusEnum.enumValues)[number];

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportAccountsCsv(filters?: { status?: string; search?: string }): Promise<string> {
  const conditions = [];
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(accounts.skipTraceStatus, filters.status as SkipTraceStatus));
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
    (r) =>
      [
        escapeCsvField(r.accountNumber),
        escapeCsvField(r.balance),
        escapeCsvField(r.status),
        escapeCsvField(r.firstName),
        escapeCsvField(r.lastName),
        escapeCsvField(r.dob),
        escapeCsvField(r.ssnLast4),
        escapeCsvField(r.bankName),
      ].join(",")
  );

  return header + csvRows.join("\n");
}
