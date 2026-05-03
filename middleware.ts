import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export async function middleware(req: NextRequest) {
    const session = await auth();
    const { pathname } = req.nextUrl;

  const isLoggedIn = !!session?.user;
    const isAdmin = session?.user?.systemRole === "ADMIN";

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
        return NextResponse.redirect(new URL("/trainee/home", req.url));
  }

  return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
