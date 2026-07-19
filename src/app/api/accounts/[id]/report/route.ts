import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, canRunTraces } from "@/lib/rbac";
import { generateCaseReport } from "@/lib/reports/pdf";
import { logger } from "@/lib/logger";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await getSessionUser();
    if (!user || !canRunTraces(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = await generateCaseReport(id);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="case_report_${id}.txt"`,
      },
    });
  } catch (err) {
    logger.error("Report generation failed", { error: String(err), accountId: id });
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
