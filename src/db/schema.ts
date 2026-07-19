import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  date,
  integer,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export const skipTraceStatusEnum = pgEnum("skip_trace_status", [
  "pending",
  "in_progress",
  "located",
  "unresolved",
  "closed",
]);

export const contactTypeEnum = pgEnum("contact_type", [
  "address",
  "phone",
  "email",
]);

export const phoneTypeEnum = pgEnum("phone_type", [
  "mobile",
  "landline",
  "voip",
  "unknown",
]);

export const resultStatusEnum = pgEnum("result_status", [
  "located",
  "partial",
  "not_found",
]);

export const complianceFlagTypeEnum = pgEnum("compliance_flag_type", [
  "bankruptcy",
  "deceased",
  "attorney_rep",
  "do_not_contact",
  "minor",
]);

export const userRoleEnum = pgEnum("user_role", [
  "skip_trace_agent",
  "senior_analyst",
  "batch_manager",
  "compliance_officer",
  "bank_client",
  "system_admin",
]);

export const batchStatusEnum = pgEnum("batch_status", [
  "queued",
  "processing",
  "complete",
  "failed",
]);

export const tracePhaseEnum = pgEnum("trace_phase", [
  "internal_audit",
  "api_waterfall",
  "batch_enrichment",
  "network_tracing",
  "manual_investigation",
]);

export const sourceTierEnum = pgEnum("source_tier", [
  "internal",
  "credit_bureau",
  "ncoa_usps",
  "utility_record",
  "public_record",
  "social_media",
  "manual",
]);

// ─── BANK CLIENTS ────────────────────────────────────────────────────────────

export const bankClients = pgTable("bank_clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── USERS (AGENTS) ───────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: userRoleEnum("role").notNull().default("skip_trace_agent"),
  bankClientId: uuid("bank_client_id").references(() => bankClients.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── DEBTORS ──────────────────────────────────────────────────────────────────

export const debtors = pgTable(
  "debtors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    middleName: varchar("middle_name", { length: 100 }),
    aliases: text("aliases"), // comma-separated AKAs
    ssnEncrypted: varchar("ssn_encrypted", { length: 255 }), // encrypted at rest
    ssnLast4: varchar("ssn_last4", { length: 4 }),
    dob: date("dob"),
    gender: varchar("gender", { length: 20 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_debtors_name").on(t.lastName, t.firstName)]
);

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bankClientId: uuid("bank_client_id")
      .notNull()
      .references(() => bankClients.id),
    debtorId: uuid("debtor_id")
      .notNull()
      .references(() => debtors.id),
    accountNumber: varchar("account_number", { length: 100 }).notNull(),
    balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
    openDate: date("open_date"),
    chargeOffDate: date("charge_off_date"),
    lastPaymentDate: date("last_payment_date"),
    skipTraceStatus: skipTraceStatusEnum("skip_trace_status")
      .notNull()
      .default("pending"),
    assignedAgentId: uuid("assigned_agent_id").references(() => users.id),
    failedCallAttempts: integer("failed_call_attempts").notNull().default(0),
    mailReturned: boolean("mail_returned").notNull().default(false),
    emailBounced: boolean("email_bounced").notNull().default(false),
    daysNoContact: integer("days_no_contact").notNull().default(0),
    lastTraceDate: timestamp("last_trace_date"),
    nextRetraceDue: timestamp("next_retrace_due"),
    priority: integer("priority").notNull().default(5), // 1=highest, 10=lowest
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_accounts_debtor").on(t.debtorId),
    index("idx_accounts_status").on(t.skipTraceStatus),
    index("idx_accounts_bank").on(t.bankClientId),
  ]
);

// ─── CONTACT RECORDS ──────────────────────────────────────────────────────────

export const contactRecords = pgTable(
  "contact_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtorId: uuid("debtor_id")
      .notNull()
      .references(() => debtors.id),
    accountId: uuid("account_id").references(() => accounts.id),
    contactType: contactTypeEnum("contact_type").notNull(),
    value: text("value").notNull(),
    phoneType: phoneTypeEnum("phone_type"),
    confidenceScore: decimal("confidence_score", {
      precision: 4,
      scale: 2,
    }).notNull().default("0.00"),
    sourceTier: sourceTierEnum("source_tier"),
    sourceProvider: varchar("source_provider", { length: 100 }),
    firstSeen: date("first_seen"),
    lastSeen: date("last_seen"),
    isCurrent: boolean("is_current").notNull().default(true),
    tcpaFlagged: boolean("tcpa_flagged").notNull().default(false),
    dncStatus: boolean("dnc_status").notNull().default(false),
    verified: boolean("verified").notNull().default(false),
    crossVerified: boolean("cross_verified").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_contacts_debtor").on(t.debtorId),
    index("idx_contacts_type").on(t.contactType),
  ]
);

// ─── RELATIVES / ASSOCIATES ───────────────────────────────────────────────────

export const debtorNetworks = pgTable("debtor_networks", {
  id: uuid("id").primaryKey().defaultRandom(),
  debtorId: uuid("debtor_id")
    .notNull()
    .references(() => debtors.id),
  relationshipType: varchar("relationship_type", { length: 100 }).notNull(), // spouse, sibling, neighbor, employer, etc.
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  sourceProvider: varchar("source_provider", { length: 100 }),
  fdcpaContactAttempts: integer("fdcpa_contact_attempts").notNull().default(0),
  lastContactAttempt: timestamp("last_contact_attempt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── COMPLIANCE FLAGS ─────────────────────────────────────────────────────────

export const complianceFlags = pgTable(
  "compliance_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtorId: uuid("debtor_id")
      .notNull()
      .references(() => debtors.id),
    accountId: uuid("account_id").references(() => accounts.id),
    flagType: complianceFlagTypeEnum("flag_type").notNull(),
    flagDate: date("flag_date").notNull(),
    source: varchar("source", { length: 100 }),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_flags_debtor").on(t.debtorId),
    index("idx_flags_type").on(t.flagType),
  ]
);

// ─── SEARCH AUDIT LOG (IMMUTABLE) ─────────────────────────────────────────────

export const searchAuditLog = pgTable(
  "search_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").references(() => accounts.id),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id),
    dataSource: varchar("data_source", { length: 100 }).notNull(),
    permissiblePurpose: varchar("permissible_purpose", { length: 255 }).notNull(),
    queryInput: jsonb("query_input"),
    resultSummary: jsonb("result_summary"),
    searchTimestamp: timestamp("search_timestamp").notNull().defaultNow(),
  },
  (t) => [
    index("idx_audit_account").on(t.accountId),
    index("idx_audit_agent").on(t.agentId),
    index("idx_audit_timestamp").on(t.searchTimestamp),
  ]
);

// ─── SKIP TRACE RESULTS ───────────────────────────────────────────────────────

export const skipTraceResults = pgTable(
  "skip_trace_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => users.id),
    resultStatus: resultStatusEnum("result_status").notNull(),
    currentPhase: tracePhaseEnum("current_phase"),
    bestAddress: text("best_address"),
    bestPhone: varchar("best_phone", { length: 30 }),
    bestEmail: varchar("best_email", { length: 255 }),
    confidenceScore: decimal("confidence_score", { precision: 4, scale: 2 }),
    sourcesQueried: jsonb("sources_queried"),
    notes: text("notes"),
    completedAt: timestamp("completed_at").defaultNow(),
  },
  (t) => [index("idx_results_account").on(t.accountId)]
);

// ─── CASE NOTES ───────────────────────────────────────────────────────────────

export const caseNotes = pgTable("case_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => users.id),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── BATCH JOBS ───────────────────────────────────────────────────────────────

export const batchJobs = pgTable("batch_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  bankClientId: uuid("bank_client_id")
    .notNull()
    .references(() => bankClients.id),
  submittedBy: uuid("submitted_by")
    .notNull()
    .references(() => users.id),
  fileName: varchar("file_name", { length: 255 }),
  status: batchStatusEnum("status").notNull().default("queued"),
  totalRecords: integer("total_records").notNull().default(0),
  processedRecords: integer("processed_records").notNull().default(0),
  locatedHigh: integer("located_high").notNull().default(0),
  locatedMed: integer("located_med").notNull().default(0),
  notFound: integer("not_found").notNull().default(0),
  complianceFlags: integer("compliance_flags_count").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── KPI SNAPSHOTS (for reporting) ───────────────────────────────────────────

export const kpiSnapshots = pgTable("kpi_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  snapshotDate: date("snapshot_date").notNull(),
  totalAccountsActive: integer("total_accounts_active").notNull().default(0),
  locatedToday: integer("located_today").notNull().default(0),
  pendingToday: integer("pending_today").notNull().default(0),
  inProgressToday: integer("in_progress_today").notNull().default(0),
  locateRate: decimal("locate_rate", { precision: 5, scale: 2 }),
  avgDaysToLocate: decimal("avg_days_to_locate", { precision: 6, scale: 2 }),
  bankruptcyFlags: integer("bankruptcy_flags").notNull().default(0),
  deceasedFlags: integer("deceased_flags").notNull().default(0),
  highConfidenceLocates: integer("high_confidence_locates").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── API PROVIDERS ─────────────────────────────────────────────────────────────

export const apiProviders = pgTable("api_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  apiKeyEncrypted: text("api_key_encrypted"),
  baseUrl: varchar("base_url", { length: 255 }).notNull(),
  rateLimit: integer("rate_limit").notNull().default(100),
  costPerSearch: decimal("cost_per_search", { precision: 10, scale: 4 }),
  priority: integer("priority").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accountSessions = pgTable("account_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires").notNull(),
});

// ─── RELATIONS ────────────────────────────────────────────────────────────────

export const bankClientsRelations = relations(bankClients, ({ many }) => ({
  accounts: many(accounts),
  users: many(users),
  batchJobs: many(batchJobs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  bankClient: one(bankClients, {
    fields: [users.bankClientId],
    references: [bankClients.id],
  }),
  assignedAccounts: many(accounts),
  auditLogs: many(searchAuditLog),
  caseNotes: many(caseNotes),
}));

export const debtorsRelations = relations(debtors, ({ many }) => ({
  accounts: many(accounts),
  contactRecords: many(contactRecords),
  complianceFlags: many(complianceFlags),
  networks: many(debtorNetworks),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  bankClient: one(bankClients, {
    fields: [accounts.bankClientId],
    references: [bankClients.id],
  }),
  debtor: one(debtors, {
    fields: [accounts.debtorId],
    references: [debtors.id],
  }),
  assignedAgent: one(users, {
    fields: [accounts.assignedAgentId],
    references: [users.id],
  }),
  contactRecords: many(contactRecords),
  complianceFlags: many(complianceFlags),
  auditLogs: many(searchAuditLog),
  skipTraceResults: many(skipTraceResults),
  caseNotes: many(caseNotes),
}));

export const contactRecordsRelations = relations(contactRecords, ({ one }) => ({
  debtor: one(debtors, {
    fields: [contactRecords.debtorId],
    references: [debtors.id],
  }),
  account: one(accounts, {
    fields: [contactRecords.accountId],
    references: [accounts.id],
  }),
}));

export const complianceFlagsRelations = relations(complianceFlags, ({ one }) => ({
  debtor: one(debtors, {
    fields: [complianceFlags.debtorId],
    references: [debtors.id],
  }),
  account: one(accounts, {
    fields: [complianceFlags.accountId],
    references: [accounts.id],
  }),
}));

export const searchAuditLogRelations = relations(searchAuditLog, ({ one }) => ({
  account: one(accounts, {
    fields: [searchAuditLog.accountId],
    references: [accounts.id],
  }),
  agent: one(users, {
    fields: [searchAuditLog.agentId],
    references: [users.id],
  }),
}));

export const skipTraceResultsRelations = relations(skipTraceResults, ({ one }) => ({
  account: one(accounts, {
    fields: [skipTraceResults.accountId],
    references: [accounts.id],
  }),
  agent: one(users, {
    fields: [skipTraceResults.agentId],
    references: [users.id],
  }),
}));

export const caseNotesRelations = relations(caseNotes, ({ one }) => ({
  account: one(accounts, {
    fields: [caseNotes.accountId],
    references: [accounts.id],
  }),
  agent: one(users, {
    fields: [caseNotes.agentId],
    references: [users.id],
  }),
}));

export const batchJobsRelations = relations(batchJobs, ({ one }) => ({
  bankClient: one(bankClients, {
    fields: [batchJobs.bankClientId],
    references: [bankClients.id],
  }),
  submitter: one(users, {
    fields: [batchJobs.submittedBy],
    references: [users.id],
  }),
}));

export const debtorNetworksRelations = relations(debtorNetworks, ({ one }) => ({
  debtor: one(debtors, {
    fields: [debtorNetworks.debtorId],
    references: [debtors.id],
  }),
}));

export const apiProvidersRelations = relations(apiProviders, () => ({}));

export const accountSessionsRelations = relations(accountSessions, ({ one }) => ({
  user: one(users, {
    fields: [accountSessions.userId],
    references: [users.id],
  }),
}));
