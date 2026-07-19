import { NextRequest, NextResponse } from "next/server";
import { searchSchema, addToSystemSchema } from "@/lib/validation";
import { getSessionUser } from "@/lib/rbac";
import { WaterfallEngine } from "@/lib/providers/waterfall";
import { LexisNexisProvider } from "@/lib/providers/lexisnexis";
import { TransUnionProvider } from "@/lib/providers/transunion";
import { ExperianProvider } from "@/lib/providers/experian";
import { UspsNcoaProvider } from "@/lib/providers/usps-ncoa";
import { db } from "@/db";
import { debtors, accounts, contactRecords, skipTraceResults } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";

const engine = new WaterfallEngine([
  new LexisNexisProvider(),
  new TransUnionProvider(),
  new ExperianProvider(),
  new UspsNcoaProvider(),
]);

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const input = parsed.data;

  const { results, finalScore, sourcesQueried } = await engine.execute(input);

  const mergedAddresses = [...new Set(results.flatMap((r) => r.data.addresses ?? []))];
  const mergedPhones = [...new Set(results.flatMap((r) => r.data.phones ?? []))];
  const mergedEmails = [...new Set(results.flatMap((r) => r.data.emails ?? []))];
  const hasBankruptcy = results.some((r) => r.data.bankruptcy);
  const hasDeceased = results.some((r) => r.data.deceased);
  const hasAttorney = results.some((r) => r.data.attorneyRepresented);

  return NextResponse.json({
    query: input,
    finalScore,
    sourcesQueried,
    resultStatus: finalScore >= 0.7 ? "located" : finalScore >= 0.3 ? "partial" : "not_found",
    contacts: {
      addresses: mergedAddresses,
      phones: mergedPhones,
      emails: mergedEmails,
    },
    flags: {
      bankruptcy: hasBankruptcy,
      deceased: hasDeceased,
      attorneyRepresented: hasAttorney,
    },
    providers: results.map((r) => ({
      provider: r.provider,
      found: r.found,
      confidence: r.confidence,
      data: r.data,
    })),
  });
}
