import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "authjs.session-token",
  });

  const isLoggedIn = !!token;
  const role = (token?.role as string) ?? "";

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname === "/api/health") {
    if (isLoggedIn && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // API route protection
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/users") && role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname.startsWith("/api/providers") && role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname.startsWith("/api/compliance") && role !== "compliance_officer" && role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname.startsWith("/api/batch") && role !== "batch_manager" && role !== "system_admin" && role !== "senior_analyst") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // App route protection
  if (pathname.startsWith("/admin") && role !== "system_admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
