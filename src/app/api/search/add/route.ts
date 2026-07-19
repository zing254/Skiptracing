import { NextRequest, NextResponse } from "next/server";
import { addToSystemSchema } from "@/lib/validation";
import { getSessionUser } from "@/lib/rbac";
import { db } from "@/db";
import { debtors, accounts, contactRecords } from "@/db/schema";
import { encrypt } from "@/lib/crypto";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = addToSystemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;

  const [debtor] = await db
    .insert(debtors)
    .values({
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      ssnLast4: data.ssnLast4,
      ssnEncrypted: data.ssnLast4 ? encrypt(`***-**-${data.ssnLast4}`) : null,
      dob: data.dob,
      gender: data.gender,
    })
    .returning();

  const [account] = await db
    .insert(accounts)
    .values({
      bankClientId: data.bankClientId,
      debtorId: debtor.id,
      accountNumber: data.accountNumber,
      balance: String(data.balance ?? 0),
      skipTraceStatus: "pending",
    })
    .returning();

  const contactInserts: Array<{
    debtorId: string;
    accountId: string;
    contactType: "address" | "phone" | "email";
    value: string;
    sourceTier: "internal";
    sourceProvider: string;
    isCurrent: boolean;
    verified: boolean;
  }> = [];

  for (const addr of data.addresses ?? []) {
    contactInserts.push({
      debtorId: debtor.id,
      accountId: account.id,
      contactType: "address",
      value: addr,
      sourceTier: "internal",
      sourceProvider: "Manual Entry",
      isCurrent: true,
      verified: false,
    });
  }

  for (const phone of data.phones ?? []) {
    contactInserts.push({
      debtorId: debtor.id,
      accountId: account.id,
      contactType: "phone",
      value: phone,
      sourceTier: "internal",
      sourceProvider: "Manual Entry",
      isCurrent: true,
      verified: false,
    });
  }

  for (const email of data.emails ?? []) {
    contactInserts.push({
      debtorId: debtor.id,
      accountId: account.id,
      contactType: "email",
      value: email,
      sourceTier: "internal",
      sourceProvider: "Manual Entry",
      isCurrent: true,
      verified: false,
    });
  }

  if (contactInserts.length > 0) {
    await db.insert(contactRecords).values(contactInserts);
  }

  return NextResponse.json({
    debtor,
    account,
    message: "Added to system successfully",
  });
}
