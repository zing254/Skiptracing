import { auth } from "./auth";

export type UserRole =
  | "system_admin"
  | "skip_trace_agent"
  | "senior_analyst"
  | "batch_manager"
  | "compliance_officer"
  | "bank_client";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  system_admin: 100,
  senior_analyst: 80,
  compliance_officer: 70,
  batch_manager: 60,
  skip_trace_agent: 50,
  bank_client: 10,
};

export function hasRole(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole];
  return userLevel >= requiredLevel;
}

export function canManageUsers(role: string): boolean {
  return role === "system_admin";
}

export function canManageProviders(role: string): boolean {
  return role === "system_admin";
}

export function canRunTraces(role: string): boolean {
  return hasRole(role, "skip_trace_agent");
}

export function canManageBatches(role: string): boolean {
  return hasRole(role, "batch_manager");
}

export function canViewCompliance(role: string): boolean {
  return hasRole(role, "compliance_officer");
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: (session.user as { id: string }).id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: (session.user as { role: string }).role as UserRole,
  };
}
