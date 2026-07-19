import { db } from "@/db";
import { accounts, debtors, skipTraceResults, searchAuditLog, caseNotes } from "@/db/schema";
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
    ...results.map((r) => `- ${r.resultStatus} (${r.confidenceScore ?? "N/A"}) | ${r.completedAt?.toISOString() ?? "N/A"} | ${(r.sourcesQueried as string[] | null)?.join(", ") ?? "N/A"}`),
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
