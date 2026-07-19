import { NextRequest } from "next/server";
import { db } from "@/db";
import { batchJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, canManageBatches } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user || !canManageBatches(user.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const abortController = new AbortController();
  const signal = abortController.signal;

  req.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const MAX_POLLS = 300; // 10 minutes at 2s intervals
      let pollCount = 0;

      const poll = async () => {
        if (signal.aborted || pollCount >= MAX_POLLS) {
          if (pollCount >= MAX_POLLS) {
            send({ error: "Poll timeout exceeded", status: "failed" });
          }
          controller.close();
          return;
        }

        pollCount++;

        const [job] = await db.select().from(batchJobs).where(eq(batchJobs.id, id)).limit(1);
        if (!job) {
          send({ error: "Batch not found" });
          controller.close();
          return;
        }

        send({
          status: job.status,
          totalRecords: job.totalRecords,
          processedRecords: job.processedRecords,
          locatedHigh: job.locatedHigh,
          locatedMed: job.locatedMed,
          notFound: job.notFound,
          complianceFlags: job.complianceFlags,
          pct: job.totalRecords > 0 ? Math.round((job.processedRecords / job.totalRecords) * 100) : 0,
        });

        if (job.status === "complete" || job.status === "failed") {
          controller.close();
          return;
        }

        setTimeout(poll, 2000);
      };

      poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
