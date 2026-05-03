import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isAdmin = session?.user?.systemRole === "ADMIN";

  const isAuthPage = nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register");
  const isAdminPage = nextUrl.pathname.startsWith("/admin");
  const isTraineePage = nextUrl.pathname.startsWith("/trainee");
  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

  if (isApiAuth) return NextResponse.next();

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && isAuthPage) {
    if (isAdmin) return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    return NextResponse.redirect(new URL("/trainee/home", nextUrl));
  }

  if (isAdminPage && !isAdmin) {
    return NextResponse.redirect(new URL("/trainee/home", nextUrl));
  }

  if (isTraineePage && isAdmin) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
