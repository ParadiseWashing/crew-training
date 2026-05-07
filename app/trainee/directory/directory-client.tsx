"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, Users } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  name: string;
  image: string | null;
  email: string | null;
  systemRole: string;
  jobRole: {
    id: string;
    title: string;
    color: string;
  } | null;
}

interface DirectoryClientProps {
  users: UserRecord[];
  currentUserId: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DirectoryClient({ users, currentUserId }: DirectoryClientProps) {
  const [search, setSearch] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);

  // Build unique job role list
  const jobRoles = React.useMemo(() => {
    const map = new Map<string, { id: string; title: string; color: string }>();
    for (const user of users) {
      if (user.jobRole && !map.has(user.jobRole.id)) {
        map.set(user.jobRole.id, user.jobRole);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [users]);

  // Filter
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.jobRole?.title.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false);

      const matchesRole = !selectedRole || u.jobRole?.id === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [users, search, selectedRole]);

  return (
    <div className="space-y-5">
      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Role filter pills */}
      {jobRoles.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedRole(null)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
              selectedRole === null
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            All
          </button>
          {jobRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors border",
                selectedRole === role.id
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
              style={
                selectedRole === role.id
                  ? { backgroundColor: role.color, borderColor: role.color }
                  : {}
              }
            >
              {role.title}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-gray-500">
        Showing{" "}
        <span className="font-semibold text-gray-700">{filtered.length}</span> of{" "}
        {users.length} team member{users.length !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-12 w-12 text-gray-200 mb-3" />
          <p className="text-base font-semibold text-gray-700 mb-1">No results</p>
          <p className="text-sm text-gray-400">
            Try adjusting your search or clearing the filter.
          </p>
          {(search || selectedRole) && (
            <button
              onClick={() => { setSearch(""); setSelectedRole(null); }}
              className="mt-3 text-sm text-accent hover:text-accent font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((user) => {
            const isCurrentUser = user.id === currentUserId;
            return (
              <div
                key={user.id}
                className={cn(
                  "bg-white rounded-xl border p-5 flex items-start gap-4 hover:shadow-md transition-shadow",
                  isCurrentUser ? "border-accent-soft ring-1 ring-accent-soft" : "border-gray-200"
                )}
              >
                <Avatar name={user.name} image={user.image} size="lg" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {user.name}
                    </p>
                    {isCurrentUser && (
                      <span className="text-xs text-accent font-medium">(you)</span>
                    )}
                  </div>

                  {user.jobRole ? (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1"
                      style={{
                        backgroundColor: `${user.jobRole.color}18`,
                        color: user.jobRole.color,
                      }}
                    >
                      {user.jobRole.title}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 mt-1 block">No role assigned</span>
                  )}

                  {user.systemRole === "ADMIN" && (
                    <Badge variant="warning" className="mt-1.5">
                      Admin
                    </Badge>
                  )}

                  {user.email && (
                    <a
                      href={`mailto:${user.email}`}
                      className="block text-xs text-gray-400 hover:text-accent transition-colors mt-1.5 truncate"
                      title={user.email}
                    >
                      {user.email}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
