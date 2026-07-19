import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { batchJobs, bankClients, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
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
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch batch jobs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bankClientId, submittedBy, fileName, totalRecords } = body;

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

    // Simulate async processing start
    setTimeout(async () => {
      try {
        await db
          .update(batchJobs)
          .set({ status: "processing", startedAt: new Date() })
          .where(eq(batchJobs.id, job.id));
      } catch (_e) {
        // ignore
      }
    }, 2000);

    return NextResponse.json({ job });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create batch job" }, { status: 500 });
  }
}
