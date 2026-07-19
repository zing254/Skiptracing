import { db } from "@/db";
import { batchJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  const totalRecords = job.totalRecords;
  let processedRecords = 0;

  const engine = new WaterfallEngine([
    new LexisNexisProvider(),
    new TransUnionProvider(),
    new ExperianProvider(),
    new UspsNcoaProvider(),
  ]);

  const queue = Array.from({ length: totalRecords }, (_, i) => i);
  const running: Promise<void>[] = [];

  for (let i = 0; i < queue.length && running.length < CONCURRENCY; i++) {
    running.push(processRecord(i));
  }

  async function processRecord(_index: number): Promise<void> {
    const result = await engine.execute({
      firstName: "Batch",
      lastName: `Record-${_index}`,
    });

    processedRecords++;

    const locatedHigh = result.finalScore >= 0.8 ? 1 : 0;
    const locatedMed = result.finalScore >= 0.5 && result.finalScore < 0.8 ? 1 : 0;
    const notFound = result.finalScore < 0.2 ? 1 : 0;

    await db
      .update(batchJobs)
      .set({
        processedRecords,
        locatedHigh: job.locatedHigh + locatedHigh,
        locatedMed: job.locatedMed + locatedMed,
        notFound: job.notFound + notFound,
      })
      .where(eq(batchJobs.id, batchId));
  }

  await Promise.all(running);

  await db
    .update(batchJobs)
    .set({
      status: "complete",
      completedAt: new Date(),
      processedRecords: totalRecords,
    })
    .where(eq(batchJobs.id, batchId));

  logger.info("Batch processing complete", { batchId, totalRecords });
}
