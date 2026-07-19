import { z } from "zod";

export const traceSchema = z.object({
  agentId: z.string().uuid(),
  traceType: z.enum(["quick", "waterfall", "full"]),
});

export const accountQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["priority", "balance", "daysNoContact", "updatedAt"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const csvRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  ssnLast4: z.string().length(4).optional(),
  dob: z.string().optional(),
  accountNumber: z.string().min(1),
  balance: z.coerce.number().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const batchCreateSchema = z.object({
  bankClientId: z.string().uuid(),
  submittedBy: z.string().uuid(),
  fileName: z.string().optional(),
  totalRecords: z.number().int().positive().optional().default(500),
  rows: z.array(csvRowSchema).optional(),
});

export const complianceResolveSchema = z.object({
  notes: z.string().min(1),
  agentId: z.string().uuid(),
});

export const caseNoteSchema = z.object({
  note: z.string().min(1).max(5000),
  agentId: z.string().uuid(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["pending", "in_progress", "located", "unresolved", "closed"]),
});

export const searchSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  ssnLast4: z.string().length(4).optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export const addToSystemSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  ssnLast4: z.string().length(4).optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  bankClientId: z.string().uuid(),
  accountNumber: z.string().min(1),
  balance: z.coerce.number().optional().default(0),
  addresses: z.array(z.string()).optional(),
  phones: z.array(z.string()).optional(),
  emails: z.array(z.string()).optional(),
});
