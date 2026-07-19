import { db } from "@/db";
import { accounts, debtors, bankClients } from "@/db/schema";
import { eq, ilike, or, and } from "drizzle-orm";

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
