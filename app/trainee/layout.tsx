import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/sidebar";

export default async function TraineeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar user={session.user} />
      <main className="lg:pl-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pt-16 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
