import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      systemRole: string;
      jobRoleId?: string;
    };
  }

  interface User {
    systemRole?: string;
    jobRoleId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    systemRole?: string;
    jobRoleId?: string;
  }
}
