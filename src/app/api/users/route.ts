import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, bankClients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, canManageUsers } from "@/lib/rbac";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageUsers(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    logger.error("Failed to fetch users", { error: String(err) });
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
