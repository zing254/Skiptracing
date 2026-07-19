import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  accounts,
  debtors,
  users,
  bankClients,
  contactRecords,
  complianceFlags,
  searchAuditLog,
  skipTraceResults,
  caseNotes,
  debtorNetworks,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Main account + debtor info
    const [acct] = await db
      .select({
        id: accounts.id,
        accountNumber: accounts.accountNumber,
        balance: accounts.balance,
        openDate: accounts.openDate,
        chargeOffDate: accounts.chargeOffDate,
        lastPaymentDate: accounts.lastPaymentDate,
        skipTraceStatus: accounts.skipTraceStatus,
        failedCallAttempts: accounts.failedCallAttempts,
        mailReturned: accounts.mailReturned,
        emailBounced: accounts.emailBounced,
        daysNoContact: accounts.daysNoContact,
        priority: accounts.priority,
        notes: accounts.notes,
        lastTraceDate: accounts.lastTraceDate,
        nextRetraceDue: accounts.nextRetraceDue,
        updatedAt: accounts.updatedAt,
        createdAt: accounts.createdAt,
        debtorId: debtors.id,
        debtorFirstName: debtors.firstName,
        debtorLastName: debtors.lastName,
        debtorMiddleName: debtors.middleName,
        debtorAliases: debtors.aliases,
        debtorDob: debtors.dob,
        debtorGender: debtors.gender,
        debtorSsnLast4: debtors.ssnLast4,
        agentId: users.id,
        agentFirstName: users.firstName,
        agentLastName: users.lastName,
        agentRole: users.role,
        bankName: bankClients.name,
        bankCode: bankClients.code,
        bankContactName: bankClients.contactName,
      })
      .from(accounts)
      .innerJoin(debtors, eq(accounts.debtorId, debtors.id))
      .leftJoin(users, eq(accounts.assignedAgentId, users.id))
      .innerJoin(bankClients, eq(accounts.bankClientId, bankClients.id))
      .where(eq(accounts.id, id));

    if (!acct) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Contact records
    const contacts = await db
      .select()
      .from(contactRecords)
      .where(eq(contactRecords.debtorId, acct.debtorId))
      .orderBy(desc(contactRecords.confidenceScore));

    // Compliance flags
    const flags = await db
      .select()
      .from(complianceFlags)
      .where(eq(complianceFlags.debtorId, acct.debtorId))
      .orderBy(desc(complianceFlags.createdAt));

    // Network
    const network = await db
      .select()
      .from(debtorNetworks)
      .where(eq(debtorNetworks.debtorId, acct.debtorId));

    // Audit log
    const auditLogs = await db
      .select({
        id: searchAuditLog.id,
        dataSource: searchAuditLog.dataSource,
        permissiblePurpose: searchAuditLog.permissiblePurpose,
        resultSummary: searchAuditLog.resultSummary,
        searchTimestamp: searchAuditLog.searchTimestamp,
        agentFirstName: users.firstName,
        agentLastName: users.lastName,
      })
      .from(searchAuditLog)
      .leftJoin(users, eq(searchAuditLog.agentId, users.id))
      .where(eq(searchAuditLog.accountId, id))
      .orderBy(desc(searchAuditLog.searchTimestamp));

    // Skip trace results
    const results = await db
      .select()
      .from(skipTraceResults)
      .where(eq(skipTraceResults.accountId, id))
      .orderBy(desc(skipTraceResults.completedAt));

    // Case notes
    const notes = await db
      .select({
        id: caseNotes.id,
        note: caseNotes.note,
        createdAt: caseNotes.createdAt,
        agentFirstName: users.firstName,
        agentLastName: users.lastName,
      })
      .from(caseNotes)
      .leftJoin(users, eq(caseNotes.agentId, users.id))
      .where(eq(caseNotes.accountId, id))
      .orderBy(desc(caseNotes.createdAt));

    return NextResponse.json({
      account: acct,
      contacts,
      flags,
      network,
      auditLogs,
      results,
      notes,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, note, agentId } = body;

    if (status) {
      await db
        .update(accounts)
        .set({ skipTraceStatus: status, updatedAt: new Date() })
        .where(eq(accounts.id, id));
    }

    if (note && agentId) {
      await db.insert(caseNotes).values({
        accountId: id,
        agentId,
        note,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
