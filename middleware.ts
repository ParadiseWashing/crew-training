import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getTokenPayload(req: NextRequest): Record<string, unknown> | null {
    const cookieName =
          process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
            : "authjs.session-token";

  const cookie = req.cookies.get(cookieName)?.value;
    if (!cookie) return null;

  try {
        const parts = cookie.split(".");
        if (parts.length !== 3) return null;
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(decoded);
  } catch {
        return null;
  }
}

export function middleware(req: NextRequest) {
    const token = getTokenPayload(req);
    const { pathname } = req.nextUrl;

  const isLoggedIn = !!token;
    const isAdmin = token?.systemRole === "ADMIN";

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
    const isAdminPage = pathname.startsWith("/admin");
    const isApiAuth = pathname.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();

  if (!isLoggedIn && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthPage) {
        if (isAdmin) return NextResponse.redirect(new URL("/admin/dashboard", req.url));
        return NextResponse.redirect(new URL("/trainee/home", req.url));
  }

  if (isAdminPage && !isAdmin) {
