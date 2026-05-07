import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.systemRole !== "ADMIN") redirect("/trainee/home");

  return (
    <div className="min-h-screen bg-[#F7F5F2]">
      <Sidebar user={session.user} />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pt-16 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
