import { db } from "@/db";
import { batchJobs, debtors, accounts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { WaterfallEngine } from "../providers/waterfall";
import { LexisNexisProvider } from "../providers/lexisnexis";
import { TransUnionProvider } from "../providers/transunion";
import { ExperianProvider } from "../providers/experian";
import { UspsNcoaProvider } from "../providers/usps-ncoa";
import { logger } from "../logger";

const CONCURRENCY = 5;

export async function processBatch(batchId: string): Promise<void> {
  const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, batchId)).limit(1);
  if (!job) throw new Error("Batch not found");

  await db.update(batchJobs).set({ status: "processing", startedAt: new Date() }).where(eq(batchJobs.id, batchId));

  const engine = new WaterfallEngine([
    new LexisNexisProvider(),
    new TransUnionProvider(),
    new ExperianProvider(),
    new UspsNcoaProvider(),
  ]);

  // Fetch actual debtor records assigned to this batch's bank client
  const records = await db
    .select({
      accountId: accounts.id,
      firstName: debtors.firstName,
      lastName: debtors.lastName,
      ssnLast4: debtors.ssnLast4,
      dob: debtors.dob,
    })
    .from(accounts)
    .innerJoin(debtors, eq(accounts.debtorId, debtors.id))
    .where(eq(accounts.bankClientId, job.bankClientId))
    .limit(job.totalRecords);

  const queue = records.map((r, i) => ({ ...r, index: i }));
  let processedRecords = 0;
  const running: Promise<void>[] = [];

  for (let i = 0; i < queue.length && running.length < CONCURRENCY; i++) {
    running.push(processRecord(queue[i]));
  }

  async function processRecord(record: typeof queue[number]): Promise<void> {
    const result = await engine.execute({
      firstName: record.firstName,
      lastName: record.lastName,
      ssnLast4: record.ssnLast4 ?? undefined,
      dob: record.dob ?? undefined,
    });

    processedRecords++;

    const locatedHigh = result.finalScore >= 0.8 ? 1 : 0;
    const locatedMed = result.finalScore >= 0.5 && result.finalScore < 0.8 ? 1 : 0;
    const notFound = result.finalScore < 0.2 ? 1 : 0;

    // Use atomic SQL increments to avoid race conditions
    await db
      .update(batchJobs)
      .set({
        processedRecords: sql`${batchJobs.processedRecords} + 1`,
        locatedHigh: sql`${batchJobs.locatedHigh} + ${locatedHigh}`,
        locatedMed: sql`${batchJobs.locatedMed} + ${locatedMed}`,
        notFound: sql`${batchJobs.notFound} + ${notFound}`,
      })
      .where(eq(batchJobs.id, batchId));
  }

  await Promise.all(running);

  await db
    .update(batchJobs)
    .set({
      status: "complete",
      completedAt: new Date(),
      processedRecords: records.length,
    })
    .where(eq(batchJobs.id, batchId));

  logger.info("Batch processing complete", { batchId, totalRecords: job.totalRecords });
}
