"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, BarChart3, Settings,
  GraduationCap, TrendingUp, Building2, Menu, X, LogOut, ChevronRight, AlertTriangle
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

interface SidebarProps {
  user: { name: string; email: string; image?: string | null; systemRole: string };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isAdmin = user.systemRole === "ADMIN";
  const navItems = isAdmin ? adminNav : traineeNav;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Crew Training</p>
            <p className="text-white/50 text-xs">
              {isAdmin ? "Admin Portal" : "Training Portal"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
              {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar name={user.name} image={user.image} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-white/50 text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-white/50 hover:text-white transition-colors p-1 rounded"
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
        className="fixed top-4 left-4 z-40 lg:hidden bg-[#1E2A3A] text-white p-2 rounded-lg shadow-lg"
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#1E2A3A] transform transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-[#1E2A3A] flex-col z-30">
        <SidebarContent />
      </div>
    </>
  );
}
