// @ts-nocheck
import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config — no Prisma, no Node.js built-ins.
// Used by middleware. Full config is in lib/auth.ts.
export const authConfig = {
    session: { strategy: "jwt" },
    pages: {
          signIn: "/login",
          error: "/login",
    },
    providers: [],
    callbacks: {
          authorized({ auth, request: { nextUrl } }) {
                  const isLoggedIn = !!auth?.user;
                  const isAuthPage =
                            nextUrl.pathname.startsWith("/login") ||
                            nextUrl.pathname.startsWith("/register");
                  const isInvitePage = nextUrl.pathname.startsWith("/invite");
                  const isAdminPage = nextUrl.pathname.startsWith("/admin");
                  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
                  const isApiInvite = nextUrl.pathname.startsWith("/api/invite");

            if (isApiAuth || isApiInvite) return true;
                  if (isInvitePage) return true;
                  if (!isLoggedIn && !isAuthPage) return false;
                  if (isLoggedIn && isAuthPage) return Response.redirect(new URL("/trainee/home", nextUrl));
                  if (isAdminPage && auth?.user?.systemRole !== "ADMIN") {
                            return Response.redirect(new URL("/trainee/home", nextUrl));
                  }
                  return true;
          },
    },
} satisfies NextAuthConfig;
