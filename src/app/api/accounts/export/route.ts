import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, canRunTraces } from "@/lib/rbac";
import { exportAccountsCsv } from "@/lib/reports/exporter";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !canRunTraces(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const csv = await exportAccountsCsv({ status, search });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="accounts_${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    logger.error("CSV export failed", { error: String(err) });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
