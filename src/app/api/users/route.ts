import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, bankClients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        bankName: bankClients.name,
      })
      .from(users)
      .leftJoin(bankClients, eq(users.bankClientId, bankClients.id))
      .orderBy(users.firstName);

    return NextResponse.json({ users: allUsers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
