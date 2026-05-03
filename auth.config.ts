// @ts-nocheck
import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config — no Prisma, no Node.js built-ins.
// Used by middleware. Full config is in lib/auth.ts.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.systemRole = user.systemRole;
        token.jobRoleId = user.jobRoleId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.systemRole = token.systemRole;
        session.user.jobRoleId = token.jobRoleId;
      }
      return session;
    },
  },
};
