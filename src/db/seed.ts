import "dotenv/config";
import { db } from "./index";
import {
  bankClients,
  users,
  debtors,
  accounts,
  contactRecords,
  complianceFlags,
  searchAuditLog,
  skipTraceResults,
  caseNotes,
  batchJobs,
  kpiSnapshots,
  debtorNetworks,
} from "./schema";

import { hash } from "bcryptjs";
import { encrypt } from "../lib/crypto";

async function seed() {
  console.log("🌱 Seeding database...");
  const defaultPassword = await hash("password123", 12);

  // ─── BANK CLIENTS ────────────────────────────────────────────────────────
  const [bank1, bank2, bank3] = await db
    .insert(bankClients)
    .values([
      {
        name: "First National Bank",
        code: "FNB001",
        contactName: "Patricia Moore",
        contactEmail: "pmoore@firstnational.com",
      },
      {
        name: "Horizon Credit Union",
        code: "HCU002",
        contactName: "David Chen",
        contactEmail: "dchen@horizoncu.com",
      },
      {
        name: "Liberty Savings Bank",
        code: "LSB003",
        contactName: "Sandra Williams",
        contactEmail: "swilliams@libertysavings.com",
      },
    ])
    .returning();

  console.log("✅ Bank clients created");

  // ─── USERS ───────────────────────────────────────────────────────────────
  const [admin, agent1, agent2, analyst, batchMgr, complianceOfficer] = await db
    .insert(users)
    .values([
      {
        firstName: "James",
        lastName: "Davis",
        email: "jdavis@skiptrace.com",
        passwordHash: defaultPassword,
        role: "system_admin",
      },
      {
        firstName: "Maria",
        lastName: "Torres",
        email: "mtorres@skiptrace.com",
        passwordHash: defaultPassword,
        role: "skip_trace_agent",
      },
      {
        firstName: "Kevin",
        lastName: "Patel",
        email: "kpatel@skiptrace.com",
        passwordHash: defaultPassword,
        role: "skip_trace_agent",
      },
      {
        firstName: "Rachel",
        lastName: "Kim",
        email: "rkim@skiptrace.com",
        passwordHash: defaultPassword,
        role: "senior_analyst",
      },
      {
        firstName: "Marcus",
        lastName: "Johnson",
        email: "mjohnson@skiptrace.com",
        passwordHash: defaultPassword,
        role: "batch_manager",
      },
      {
        firstName: "Linda",
        lastName: "Nguyen",
        email: "lnguyen@skiptrace.com",
        passwordHash: defaultPassword,
        role: "compliance_officer",
      },
    ])
    .returning();

  console.log("✅ Users created");

  // ─── DEBTORS ─────────────────────────────────────────────────────────────
  const [
    debtor1, debtor2, debtor3, debtor4, debtor5,
    debtor6, debtor7, debtor8, debtor9, debtor10,
    debtor11, debtor12
  ] = await db
    .insert(debtors)
    .values([
      { firstName: "John", lastName: "Smith", middleName: "Allen", ssnLast4: "4521", ssnEncrypted: encrypt("123-45-4521"), dob: "1978-03-12", gender: "M", aliases: "J. Smith, Johnny Smith" },
      { firstName: "Mary", lastName: "Jones", ssnLast4: "8834", ssnEncrypted: encrypt("987-65-8834"), dob: "1985-07-22", gender: "F" },
      { firstName: "Robert", lastName: "Williams", middleName: "Lee", ssnLast4: "2291", ssnEncrypted: encrypt("456-78-2291"), dob: "1971-11-05", gender: "M" },
      { firstName: "Patricia", lastName: "Brown", ssnLast4: "6612", ssnEncrypted: encrypt("321-54-6612"), dob: "1990-04-18", gender: "F", aliases: "Pat Brown, Patty Brown" },
      { firstName: "Michael", lastName: "Davis", ssnLast4: "3347", ssnEncrypted: encrypt("654-32-3347"), dob: "1983-09-30", gender: "M" },
      { firstName: "Linda", lastName: "Miller", ssnLast4: "9921", ssnEncrypted: encrypt("111-22-9921"), dob: "1968-01-14", gender: "F" },
      { firstName: "James", lastName: "Wilson", ssnLast4: "7756", ssnEncrypted: encrypt("222-33-7756"), dob: "1995-06-07", gender: "M" },
      { firstName: "Barbara", lastName: "Moore", ssnLast4: "4438", ssnEncrypted: encrypt("333-44-4438"), dob: "1962-12-25", gender: "F" },
      { firstName: "William", lastName: "Taylor", ssnLast4: "5519", ssnEncrypted: encrypt("444-55-5519"), dob: "1979-08-17", gender: "M" },
      { firstName: "Elizabeth", lastName: "Anderson", ssnLast4: "1123", ssnEncrypted: encrypt("555-66-1123"), dob: "1988-02-28", gender: "F" },
      { firstName: "Carlos", lastName: "Martinez", ssnLast4: "8874", ssnEncrypted: encrypt("666-77-8874"), dob: "1976-10-11", gender: "M", aliases: "Carl Martinez" },
      { firstName: "Susan", lastName: "Thompson", ssnLast4: "3365", ssnEncrypted: encrypt("777-88-3365"), dob: "1993-05-03", gender: "F" },
    ])
    .returning();

  console.log("✅ Debtors created");

  // ─── ACCOUNTS ────────────────────────────────────────────────────────────
  const [
    acct1, acct2, acct3, acct4, acct5,
    acct6, acct7, acct8, acct9, acct10,
    acct11, acct12
  ] = await db
    .insert(accounts)
    .values([
      { bankClientId: bank1.id, debtorId: debtor1.id, accountNumber: "FNB-4490", balance: "12400.00", openDate: "2020-03-15", chargeOffDate: "2024-09-01", skipTraceStatus: "in_progress", assignedAgentId: agent1.id, failedCallAttempts: 5, mailReturned: true, daysNoContact: 45, priority: 1 },
      { bankClientId: bank1.id, debtorId: debtor2.id, accountNumber: "FNB-4491", balance: "8900.00", openDate: "2019-11-20", chargeOffDate: "2024-08-15", skipTraceStatus: "in_progress", assignedAgentId: agent1.id, failedCallAttempts: 3, daysNoContact: 32, priority: 2 },
      { bankClientId: bank1.id, debtorId: debtor3.id, accountNumber: "FNB-4492", balance: "22750.00", openDate: "2018-06-10", chargeOffDate: "2024-07-01", skipTraceStatus: "located", assignedAgentId: agent1.id, failedCallAttempts: 7, mailReturned: true, daysNoContact: 60, priority: 1 },
      { bankClientId: bank2.id, debtorId: debtor4.id, accountNumber: "HCU-8821", balance: "5200.00", openDate: "2021-02-28", chargeOffDate: "2024-10-01", skipTraceStatus: "pending", assignedAgentId: agent2.id, failedCallAttempts: 2, daysNoContact: 18, priority: 3 },
      { bankClientId: bank2.id, debtorId: debtor5.id, accountNumber: "HCU-8823", balance: "31400.00", openDate: "2017-08-05", chargeOffDate: "2024-06-15", skipTraceStatus: "unresolved", assignedAgentId: agent2.id, failedCallAttempts: 10, mailReturned: true, emailBounced: true, daysNoContact: 90, priority: 1 },
      { bankClientId: bank2.id, debtorId: debtor6.id, accountNumber: "HCU-8824", balance: "7650.00", openDate: "2022-01-10", chargeOffDate: "2024-11-01", skipTraceStatus: "pending", assignedAgentId: agent2.id, failedCallAttempts: 1, daysNoContact: 8, priority: 5 },
      { bankClientId: bank3.id, debtorId: debtor7.id, accountNumber: "LSB-1188", balance: "15200.00", openDate: "2020-09-22", chargeOffDate: "2024-07-30", skipTraceStatus: "closed", assignedAgentId: agent1.id, failedCallAttempts: 4, daysNoContact: 25, priority: 4 },
      { bankClientId: bank3.id, debtorId: debtor8.id, accountNumber: "LSB-1190", balance: "9300.00", openDate: "2019-05-14", chargeOffDate: "2024-09-20", skipTraceStatus: "pending", assignedAgentId: agent2.id, failedCallAttempts: 3, mailReturned: true, daysNoContact: 40, priority: 2 },
      { bankClientId: bank1.id, debtorId: debtor9.id, accountNumber: "FNB-4495", balance: "18700.00", openDate: "2016-12-01", chargeOffDate: "2024-05-15", skipTraceStatus: "located", assignedAgentId: analyst.id, failedCallAttempts: 8, mailReturned: true, daysNoContact: 70, priority: 1 },
      { bankClientId: bank2.id, debtorId: debtor10.id, accountNumber: "HCU-8830", balance: "4100.00", openDate: "2023-03-07", chargeOffDate: "2024-12-01", skipTraceStatus: "pending", assignedAgentId: agent1.id, failedCallAttempts: 2, daysNoContact: 15, priority: 4 },
      { bankClientId: bank3.id, debtorId: debtor11.id, accountNumber: "LSB-1195", balance: "27800.00", openDate: "2018-07-19", chargeOffDate: "2024-08-01", skipTraceStatus: "in_progress", assignedAgentId: analyst.id, failedCallAttempts: 6, mailReturned: true, emailBounced: true, daysNoContact: 55, priority: 1 },
      { bankClientId: bank1.id, debtorId: debtor12.id, accountNumber: "FNB-4501", balance: "3800.00", openDate: "2022-09-15", chargeOffDate: "2024-11-20", skipTraceStatus: "pending", assignedAgentId: agent2.id, failedCallAttempts: 1, daysNoContact: 5, priority: 6 },
    ])
    .returning();

  console.log("✅ Accounts created");

  // ─── CONTACT RECORDS ─────────────────────────────────────────────────────
  await db.insert(contactRecords).values([
    // Debtor 1 - John Smith
    { debtorId: debtor1.id, accountId: acct1.id, contactType: "address", value: "123 Oak St, Dallas TX 75201", confidenceScore: "0.82", sourceTier: "credit_bureau", sourceProvider: "LexisNexis", firstSeen: "2025-09-15", lastSeen: "2026-01-10", isCurrent: true, crossVerified: true, verified: true },
    { debtorId: debtor1.id, accountId: acct1.id, contactType: "address", value: "456 Elm Ave, Austin TX 78701", confidenceScore: "0.61", sourceTier: "public_record", sourceProvider: "Tracers", firstSeen: "2024-06-01", lastSeen: "2025-05-22", isCurrent: false },
    { debtorId: debtor1.id, accountId: acct1.id, contactType: "address", value: "789 Pine Rd, Houston TX 77001", confidenceScore: "0.34", sourceTier: "public_record", sourceProvider: "County Records", firstSeen: "2023-01-01", lastSeen: "2024-05-30", isCurrent: false },
    { debtorId: debtor1.id, accountId: acct1.id, contactType: "phone", value: "(214) 555-1234", phoneType: "mobile", confidenceScore: "0.75", sourceTier: "credit_bureau", sourceProvider: "TransUnion TLO", firstSeen: "2025-08-01", lastSeen: "2026-01-05", isCurrent: true, tcpaFlagged: true },
    { debtorId: debtor1.id, accountId: acct1.id, contactType: "phone", value: "(512) 555-5678", phoneType: "landline", confidenceScore: "0.55", sourceTier: "public_record", sourceProvider: "Tracers", firstSeen: "2024-01-01", lastSeen: "2025-11-01", isCurrent: true },
    { debtorId: debtor1.id, accountId: acct1.id, contactType: "email", value: "jsmith@gmail.com", confidenceScore: "0.70", sourceTier: "internal", sourceProvider: "Bank File", firstSeen: "2020-03-15", lastSeen: "2024-09-01", isCurrent: true, verified: true },

    // Debtor 2 - Mary Jones
    { debtorId: debtor2.id, accountId: acct2.id, contactType: "address", value: "2201 Riverside Dr, Chicago IL 60601", confidenceScore: "0.78", sourceTier: "ncoa_usps", sourceProvider: "USPS NCOA", firstSeen: "2025-10-01", lastSeen: "2026-01-15", isCurrent: true, crossVerified: true, verified: true },
    { debtorId: debtor2.id, accountId: acct2.id, contactType: "phone", value: "(312) 555-9911", phoneType: "mobile", confidenceScore: "0.68", sourceTier: "credit_bureau", sourceProvider: "LexisNexis", firstSeen: "2025-07-01", lastSeen: "2026-01-10", isCurrent: true, tcpaFlagged: true },
    { debtorId: debtor2.id, accountId: acct2.id, contactType: "email", value: "mjones85@yahoo.com", confidenceScore: "0.55", sourceTier: "internal", sourceProvider: "Bank File", firstSeen: "2019-11-20", lastSeen: "2024-08-15", isCurrent: true },

    // Debtor 3 - Robert Williams (located)
    { debtorId: debtor3.id, accountId: acct3.id, contactType: "address", value: "4400 Market St, Philadelphia PA 19104", confidenceScore: "0.91", sourceTier: "credit_bureau", sourceProvider: "Experian", firstSeen: "2026-01-02", lastSeen: "2026-01-18", isCurrent: true, crossVerified: true, verified: true },
    { debtorId: debtor3.id, accountId: acct3.id, contactType: "phone", value: "(215) 555-4422", phoneType: "landline", confidenceScore: "0.85", sourceTier: "utility_record", sourceProvider: "MicroBilt", firstSeen: "2025-11-01", lastSeen: "2026-01-15", isCurrent: true, verified: true },
    { debtorId: debtor3.id, accountId: acct3.id, contactType: "email", value: "rwilliams71@hotmail.com", confidenceScore: "0.72", sourceTier: "internal", sourceProvider: "Bank File", firstSeen: "2018-06-10", lastSeen: "2024-07-01", isCurrent: true, verified: true },

    // Debtor 5 - Michael Davis (unresolved - difficult)
    { debtorId: debtor5.id, accountId: acct5.id, contactType: "address", value: "Unknown — Mail Forwarding Expired", confidenceScore: "0.12", sourceTier: "public_record", sourceProvider: "USPS NCOA", firstSeen: "2024-03-01", lastSeen: "2025-01-01", isCurrent: false },
    { debtorId: debtor5.id, accountId: acct5.id, contactType: "phone", value: "(469) 555-0077", phoneType: "mobile", confidenceScore: "0.18", sourceTier: "public_record", sourceProvider: "Tracers", firstSeen: "2023-09-01", lastSeen: "2024-06-01", isCurrent: false, tcpaFlagged: true, dncStatus: true },

    // Debtor 9 - William Taylor (located)
    { debtorId: debtor9.id, accountId: acct9.id, contactType: "address", value: "8800 Lake Shore Dr, Miami FL 33101", confidenceScore: "0.88", sourceTier: "credit_bureau", sourceProvider: "TransUnion TLO", firstSeen: "2026-01-10", lastSeen: "2026-01-18", isCurrent: true, crossVerified: true, verified: true },
    { debtorId: debtor9.id, accountId: acct9.id, contactType: "phone", value: "(305) 555-7733", phoneType: "mobile", confidenceScore: "0.82", sourceTier: "credit_bureau", sourceProvider: "LexisNexis", firstSeen: "2025-12-01", lastSeen: "2026-01-18", isCurrent: true, tcpaFlagged: false, verified: true },

    // Debtor 11 - Carlos Martinez (in progress)
    { debtorId: debtor11.id, accountId: acct11.id, contactType: "address", value: "321 Cesar Chavez Blvd, San Antonio TX 78201", confidenceScore: "0.55", sourceTier: "public_record", sourceProvider: "Tracers", firstSeen: "2025-06-01", lastSeen: "2025-12-01", isCurrent: false },
    { debtorId: debtor11.id, accountId: acct11.id, contactType: "phone", value: "(210) 555-8844", phoneType: "mobile", confidenceScore: "0.48", sourceTier: "public_record", sourceProvider: "Searchbug", firstSeen: "2025-01-01", lastSeen: "2025-10-01", isCurrent: false, tcpaFlagged: true },
  ]);

  console.log("✅ Contact records created");

  // ─── DEBTOR NETWORKS ─────────────────────────────────────────────────────
  await db.insert(debtorNetworks).values([
    { debtorId: debtor1.id, relationshipType: "Spouse", name: "Sarah Smith", phone: "(214) 555-9999", sourceProvider: "LexisNexis" },
    { debtorId: debtor1.id, relationshipType: "Sibling", name: "Bob Smith", phone: "(972) 555-4444", sourceProvider: "LexisNexis" },
    { debtorId: debtor1.id, relationshipType: "Employer", name: "ABC Corp — 500 Main St Dallas TX", sourceProvider: "MicroBilt" },
    { debtorId: debtor2.id, relationshipType: "Parent", name: "Dorothy Jones", phone: "(773) 555-2211", sourceProvider: "Tracers" },
    { debtorId: debtor3.id, relationshipType: "Neighbor", name: "Thomas Hardy", phone: "(215) 555-5500", sourceProvider: "LexisNexis" },
    { debtorId: debtor5.id, relationshipType: "Sibling", name: "Angela Davis", phone: "(469) 555-3322", sourceProvider: "Tracers", fdcpaContactAttempts: 1 },
    { debtorId: debtor11.id, relationshipType: "Spouse", name: "Rosa Martinez", phone: "(210) 555-1100", sourceProvider: "LexisNexis" },
  ]);

  console.log("✅ Debtor networks created");

  // ─── COMPLIANCE FLAGS ────────────────────────────────────────────────────
  await db.insert(complianceFlags).values([
    { debtorId: debtor7.id, accountId: acct7.id, flagType: "bankruptcy", flagDate: "2024-11-15", source: "PACER", notes: "Chapter 7 filed. Automatic stay in effect. Account closed.", isActive: true },
    { debtorId: debtor8.id, accountId: acct8.id, flagType: "deceased", flagDate: "2024-12-01", source: "SSDI Match", notes: "Death verified via Social Security Death Index. Account to be closed.", isActive: true },
    { debtorId: debtor6.id, accountId: acct6.id, flagType: "attorney_rep", flagDate: "2025-01-05", source: "Letter Received", notes: "Debtor represented by Counsel Law Group. All communication must be routed through attorney.", isActive: true },
    { debtorId: debtor4.id, accountId: acct4.id, flagType: "do_not_contact", flagDate: "2025-01-10", source: "Debtor Request", notes: "Written cease communication request received per FDCPA §1692c(c).", isActive: true },
  ]);

  console.log("✅ Compliance flags created");

  // ─── SEARCH AUDIT LOG ─────────────────────────────────────────────────────
  await db.insert(searchAuditLog).values([
    { accountId: acct1.id, agentId: agent1.id, dataSource: "LexisNexis Accurint", permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)", queryInput: { name: "John Smith", ssn_last4: "4521", dob: "1978-03-12" }, resultSummary: { addresses: 3, phones: 2, emails: 1, confidence: 0.82 }, searchTimestamp: new Date("2026-07-18T09:14:00") },
    { accountId: acct1.id, agentId: agent1.id, dataSource: "TransUnion TLO", permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)", queryInput: { name: "John Smith", ssn_last4: "4521" }, resultSummary: { phones: 1, credit_header: true }, searchTimestamp: new Date("2026-07-18T09:15:00") },
    { accountId: acct2.id, agentId: agent1.id, dataSource: "USPS NCOA", permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)", queryInput: { name: "Mary Jones", address: "Old address on file" }, resultSummary: { new_address_found: true, confidence: 0.78 }, searchTimestamp: new Date("2026-07-18T10:02:00") },
    { accountId: acct3.id, agentId: agent1.id, dataSource: "Experian Skip Trace", permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)", queryInput: { name: "Robert Williams", ssn_last4: "2291" }, resultSummary: { addresses: 1, phones: 1, confidence: 0.91 }, searchTimestamp: new Date("2026-07-18T10:45:00") },
    { accountId: acct5.id, agentId: agent2.id, dataSource: "LexisNexis Accurint", permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)", queryInput: { name: "Michael Davis", ssn_last4: "3347" }, resultSummary: { no_results: true, confidence: 0.12 }, searchTimestamp: new Date("2026-07-18T11:30:00") },
    { accountId: acct5.id, agentId: agent2.id, dataSource: "TransUnion TLO", permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)", queryInput: { name: "Michael Davis", ssn_last4: "3347" }, resultSummary: { no_results: true }, searchTimestamp: new Date("2026-07-18T11:32:00") },
    { accountId: acct9.id, agentId: analyst.id, dataSource: "TransUnion TLO", permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)", queryInput: { name: "William Taylor", ssn_last4: "5519" }, resultSummary: { addresses: 1, phones: 1, confidence: 0.88 }, searchTimestamp: new Date("2026-07-17T14:20:00") },
    { accountId: acct11.id, agentId: analyst.id, dataSource: "Tracers", permissiblePurpose: "Debt Collection — FCRA §604(a)(3)(A)", queryInput: { name: "Carlos Martinez", ssn_last4: "8874", aliases: "Carl Martinez" }, resultSummary: { addresses: 1, phones: 1, confidence: 0.55 }, searchTimestamp: new Date("2026-07-18T08:55:00") },
  ]);

  console.log("✅ Search audit log created");

  // ─── SKIP TRACE RESULTS ───────────────────────────────────────────────────
  await db.insert(skipTraceResults).values([
    { accountId: acct3.id, agentId: agent1.id, resultStatus: "located", currentPhase: "api_waterfall", bestAddress: "4400 Market St, Philadelphia PA 19104", bestPhone: "(215) 555-4422", bestEmail: "rwilliams71@hotmail.com", confidenceScore: "0.91", sourcesQueried: ["LexisNexis", "Experian", "USPS NCOA"], notes: "High confidence locate via Experian. Address cross-verified with utility records." },
    { accountId: acct9.id, agentId: analyst.id, resultStatus: "located", currentPhase: "api_waterfall", bestAddress: "8800 Lake Shore Dr, Miami FL 33101", bestPhone: "(305) 555-7733", bestEmail: null, confidenceScore: "0.88", sourcesQueried: ["TransUnion TLO", "LexisNexis"], notes: "Located via TLO credit header pull. Phone verified active." },
    { accountId: acct5.id, agentId: agent2.id, resultStatus: "not_found", currentPhase: "manual_investigation", bestAddress: null, bestPhone: null, bestEmail: null, confidenceScore: "0.12", sourcesQueried: ["LexisNexis", "TransUnion", "Tracers", "USPS NCOA", "County Records"], notes: "Exhausted all Tier 1-3 sources. Escalated to senior analyst. Possible intentional skip." },
  ]);

  console.log("✅ Skip trace results created");

  // ─── CASE NOTES ────────────────────────────────────────────────────────────
  await db.insert(caseNotes).values([
    { accountId: acct1.id, agentId: agent1.id, note: "07/18 — Ran full waterfall trace. High confidence address found at 123 Oak St Dallas. Will attempt mail contact first. TCPA flag on mobile number — need prior express consent before dialing." },
    { accountId: acct1.id, agentId: agent1.id, note: "07/15 — Attempted call to (214) 555-1234 — no answer. Left no message per FDCPA guidelines. Attempt #4." },
    { accountId: acct2.id, agentId: agent1.id, note: "07/18 — USPS NCOA returned updated address in Chicago. Sending validation letter. Following up in 10 days." },
    { accountId: acct3.id, agentId: agent1.id, note: "07/18 — LOCATED. High confidence (0.91) via Experian. Forwarding to collections queue for outreach." },
    { accountId: acct5.id, agentId: agent2.id, note: "07/18 — All sources exhausted. No locate. Escalated to Rachel Kim (Senior Analyst) for manual investigation including social media review." },
    { accountId: acct5.id, agentId: analyst.id, note: "07/18 — Manual investigation initiated. Checking public LinkedIn, Facebook (public only). Contacting sibling Angela Davis per FDCPA §1692b — will not reveal debt, confirm location info only." },
    { accountId: acct9.id, agentId: analyst.id, note: "07/17 — LOCATED in Miami FL via TLO. Phone verified active. Advancing to collections immediately." },
    { accountId: acct11.id, agentId: analyst.id, note: "07/18 — Medium confidence locate (0.55) in San Antonio. Address may be stale (6 months old). Re-tracing via Experian before sending mail." },
  ]);

  console.log("✅ Case notes created");

  // ─── BATCH JOBS ───────────────────────────────────────────────────────────
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await db.insert(batchJobs).values([
    { bankClientId: bank1.id, submittedBy: batchMgr.id, fileName: "FNB_batch_20260718_2241.csv", status: "processing", totalRecords: 1200, processedRecords: 936, locatedHigh: 421, locatedMed: 178, notFound: 89, complianceFlags: 18, startedAt: twoHoursAgo },
    { bankClientId: bank2.id, submittedBy: batchMgr.id, fileName: "HCU_batch_20260717_2240.csv", status: "complete", totalRecords: 450, processedRecords: 450, locatedHigh: 312, locatedMed: 89, notFound: 49, complianceFlags: 18, startedAt: fourHoursAgo, completedAt: twoHoursAgo },
    { bankClientId: bank3.id, submittedBy: batchMgr.id, fileName: "LSB_batch_20260718_2242.csv", status: "queued", totalRecords: 800, processedRecords: 0, locatedHigh: 0, locatedMed: 0, notFound: 0, complianceFlags: 0 },
    { bankClientId: bank1.id, submittedBy: batchMgr.id, fileName: "FNB_batch_20260716_2238.csv", status: "complete", totalRecords: 2500, processedRecords: 2500, locatedHigh: 1625, locatedMed: 437, notFound: 438, complianceFlags: 76, startedAt: yesterday, completedAt: new Date(yesterday.getTime() + 3 * 60 * 60 * 1000) },
  ]);

  console.log("✅ Batch jobs created");

  // ─── KPI SNAPSHOTS ────────────────────────────────────────────────────────
  const days = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const kpiData = days.map((daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split("T")[0];
    const located = Math.floor(Math.random() * 30) + 55;
    const pending = Math.floor(Math.random() * 50) + 90;
    const inProg = Math.floor(Math.random() * 20) + 25;
    const total = located + pending + inProg + Math.floor(Math.random() * 20) + 20;
    const locateRate = ((located / (total * 0.5)) * 100).toFixed(2);
    return {
      snapshotDate: dateStr,
      totalAccountsActive: total,
      locatedToday: located,
      pendingToday: pending,
      inProgressToday: inProg,
      locateRate: locateRate,
      avgDaysToLocate: (Math.random() * 2 + 2).toFixed(2),
      bankruptcyFlags: Math.floor(Math.random() * 5) + 1,
      deceasedFlags: Math.floor(Math.random() * 3),
      highConfidenceLocates: Math.floor(located * 0.65),
    };
  });

  await db.insert(kpiSnapshots).values(kpiData);

  console.log("✅ KPI snapshots created");
  console.log("\n🎉 Seeding complete!");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
