import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { DirectoryClient } from "./directory-client";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      systemRole: true,
      jobRole: {
        select: {
          id: true,
          title: true,
          color: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Serialize: only pass email if it's the current user's own record or user is admin
  const currentUserRole = session.user.systemRole as string | undefined;
  const isAdmin = currentUserRole === "ADMIN";

  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    image: u.image ?? null,
    email: isAdmin || u.id === session.user.id ? u.email : null,
    systemRole: u.systemRole,
    jobRole: u.jobRole
      ? {
          id: u.jobRole.id,
          title: u.jobRole.title,
          color: u.jobRole.color ?? "#3B82F6",
        }
      : null,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Team Directory"
        description="Browse your colleagues and their roles."
      />
      <DirectoryClient users={serializedUsers} currentUserId={session.user.id} />
    </div>
  );
}
