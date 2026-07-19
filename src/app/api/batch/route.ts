import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { batchJobs, bankClients, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSessionUser, canManageBatches } from "@/lib/rbac";
import { batchCreateSchema } from "@/lib/validation";
import { processBatch } from "@/lib/batch/orchestrator";
import { logger } from "@/lib/logger";

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageBatches(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const jobs = await db
      .select({
        id: batchJobs.id,
        fileName: batchJobs.fileName,
        status: batchJobs.status,
        totalRecords: batchJobs.totalRecords,
        processedRecords: batchJobs.processedRecords,
        locatedHigh: batchJobs.locatedHigh,
        locatedMed: batchJobs.locatedMed,
        notFound: batchJobs.notFound,
        complianceFlags: batchJobs.complianceFlags,
        startedAt: batchJobs.startedAt,
        completedAt: batchJobs.completedAt,
        createdAt: batchJobs.createdAt,
        bankName: bankClients.name,
        bankCode: bankClients.code,
        submitterFirst: users.firstName,
        submitterLast: users.lastName,
      })
      .from(batchJobs)
      .leftJoin(bankClients, eq(batchJobs.bankClientId, bankClients.id))
      .leftJoin(users, eq(batchJobs.submittedBy, users.id))
      .orderBy(desc(batchJobs.createdAt));

    return NextResponse.json({ jobs });
  } catch (err) {
    logger.error("Failed to fetch batch jobs", { error: String(err) });
    return NextResponse.json({ error: "Failed to fetch batch jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageBatches(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const parsed = batchCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { bankClientId, submittedBy, fileName, totalRecords } = parsed.data;

    const [job] = await db
      .insert(batchJobs)
      .values({
        bankClientId,
        submittedBy,
        fileName: fileName ?? `batch_${Date.now()}.csv`,
        status: "queued",
        totalRecords: totalRecords ?? 0,
      })
      .returning();

    // Start batch processing in background
    processBatch(job.id).catch((err) => {
      logger.error("Batch processing failed", { batchId: job.id, error: String(err) });
    });

    return NextResponse.json({ job });
  } catch (err) {
    logger.error("Failed to create batch job", { error: String(err) });
    return NextResponse.json({ error: "Failed to create batch job" }, { status: 500 });
  }
}
