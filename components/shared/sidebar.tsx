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
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shadow-sm flex-shrink-0">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="pa-wordmark text-2xl">Paradise</p>
            <p className="text-sm font-semibold text-sidebar-foreground -mt-0.5">Crew Training</p>
            <p className="text-xs text-muted">
              {isAdmin ? "Admin Portal" : "Training Portal"}
            </p>
          </div>
        </div>
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-accent-tint text-accent-hover"
                  : "text-sidebar-foreground/80 hover:bg-n-50 hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent" />
              )}
              {item.icon}
              {item.label}
              {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar name={user.name} image={user.image} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-foreground text-sm font-medium truncate">{user.name}</p>
            <p className="text-muted text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground hover:text-sidebar-foreground transition-colors p-1.5 rounded-md hover:bg-n-50"
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
        className="fixed top-4 left-4 z-40 lg:hidden bg-card text-sidebar-foreground border border-sidebar-border p-2 rounded-lg shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border shadow-xl transform transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 text-muted-foreground hover:text-sidebar-foreground p-1 rounded-md hover:bg-n-50"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border flex-col z-30">
        <SidebarContent />
      </div>
    </>
  );
}
