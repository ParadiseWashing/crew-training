import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/shared/sidebar";

export default async function TraineeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");

  // Resolve whether this user can see the Leadership tab.
  // Admins always see it; trainees only if their JobRole.canAccessLeadership is true.
  let canAccessLeadership = session.user.systemRole === "ADMIN";
  if (!canAccessLeadership) {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { jobRole: { select: { canAccessLeadership: true } } },
    });
    canAccessLeadership = Boolean(u?.jobRole?.canAccessLeadership);
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar user={session.user} canAccessLeadership={canAccessLeadership} />
      <main className="lg:pl-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pt-16 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
