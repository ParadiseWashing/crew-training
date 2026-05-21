"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, Settings,
  GraduationCap, TrendingUp, Building2, Menu, X, LogOut, ChevronRight, AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: "Content", href: "/admin/content", icon: <BookOpen className="h-5 w-5" /> },
  { label: "People", href: "/admin/people", icon: <Users className="h-5 w-5" /> },
  { label: "Reports", href: "/admin/reports", icon: <BarChart3 className="h-5 w-5" /> },
  { label: "Audit Flags", href: "/admin/reports/flags", icon: <AlertTriangle className="h-5 w-5" /> },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="h-5 w-5" /> },
];

const traineeNav: NavItem[] = [
  { label: "My Training", href: "/trainee/home", icon: <GraduationCap className="h-5 w-5" /> },
  { label: "My Progress", href: "/trainee/progress", icon: <TrendingUp className="h-5 w-5" /> },
  { label: "Directory", href: "/trainee/directory", icon: <Building2 className="h-5 w-5" /> },
];

const leadershipNavItem: NavItem = {
  label: "Leadership",
  href: "/trainee/leadership",
  icon: <ShieldCheck className="h-5 w-5" />,
};

interface SidebarProps {
  user: { name: string; email: string; image?: string | null; systemRole: string };
  /** True when the user's JobRole has canAccessLeadership=true OR they are an admin. */
  canAccessLeadership?: boolean;
}

export function Sidebar({ user, canAccessLeadership = false }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isAdmin = user.systemRole === "ADMIN";
  const navItems = isAdmin
    ? adminNav
    : canAccessLeadership
      ? [...traineeNav, leadershipNavItem]
      : traineeNav;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#FFFFFF]">
      {/* Brand: Paradise wordmark */}
      <div className="px-5 py-5 border-b border-[#E8E4DE]">
        <Link href={isAdmin ? "/admin/dashboard" : "/trainee/home"} className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#0E0E0E] flex items-center justify-center text-lg">
            🌴
          </div>
          <div className="leading-none">
            <p
              className="text-[28px] text-[#F08A3E] -mb-1"
              style={{ fontFamily: "'Caveat', cursive", letterSpacing: "0.5px" }}
            >
              Paradise
            </p>
            <p className="text-[#6E665D] text-[10px] uppercase tracking-[0.12em] font-semibold">
              {isAdmin ? "Academy · Admin" : "Academy"}
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#FEF5EC] text-[#D9701F]"
                  : "text-[#34302C] hover:bg-[#F7F5F2] hover:text-[#0E0E0E]"
              )}
            >
              {item.icon}
              {item.label}
              {isActive && <ChevronRight className="h-4 w-4 ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-[#E8E4DE]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-[#F7F5F2]">
          <Avatar name={user.name} image={user.image} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-[#0E0E0E] text-sm font-semibold truncate">{user.name}</p>
            <p className="text-[#6E665D] text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[#6E665D] hover:text-[#0E0E0E] transition-colors p-1 rounded"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden bg-white text-[#0E0E0E] p-2 rounded-lg shadow border border-[#E8E4DE]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform lg:hidden border-r border-[#E8E4DE]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-4 top-4 text-[#6E665D] hover:text-[#0E0E0E] z-10"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-[#E8E4DE] flex-col z-30">
        <SidebarContent />
      </div>
    </>
  );
}
