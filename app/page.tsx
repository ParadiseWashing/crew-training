import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.systemRole === "ADMIN") {
    redirect("/admin/dashboard");
  }

  redirect("/trainee/home");
}
