"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, Briefcase, Mail, Copy, Check, Send } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobRoleSummary {
  id: string;
  title: string;
  color?: string | null;
}

interface SubjectSummary {
  id: string;
  title: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  systemRole: string;
  jobRoleId?: string | null;
  jobRole?: JobRoleSummary | null;
}

interface JobRoleData {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  subjects: { subject: SubjectSummary }[];
}

// ─── CreateUserButton ──────────────────────────────────────────────────────────

export function CreateUserButton({ jobRoles }: { jobRoles: JobRoleSummary[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    systemRole: "TRAINEE",
    jobRoleId: "",
  });

  function setField(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          password: form.password || undefined,
          jobRoleId: form.jobRoleId === "none" ? null : form.jobRoleId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create user");
      }
      toast(
        form.password
          ? "Employee created successfully"
          : "Employee created — invite pending until release",
        "success"
      );
      setOpen(false);
      setForm({ name: "", email: "", password: "", systemRole: "TRAINEE", jobRoleId: "none" });
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>
            Create a new account. Leave the password blank to send them an invite email instead
            (they&apos;ll set their own password).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Jane Smith"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            required
          />
          <Input
            label="Password (optional)"
            type="password"
            placeholder="Leave blank to send invite"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            minLength={form.password ? 8 : undefined}
          />
          {!form.password && (
            <div className="rounded-lg border border-accent-soft bg-accent-tint px-3 py-2.5 text-xs text-accent-hover">
              <span className="font-semibold">Invite mode:</span> An invite link will be generated.
              The account stays locked until the employee accepts it from the People page after
              you&apos;ve released the app.
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">System Role</label>
            <Select value={form.systemRole} onValueChange={(v) => setField("systemRole", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRAINEE">Trainee</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Job Role</label>
            <Select value={form.jobRoleId} onValueChange={(v) => setField("jobRoleId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select job role (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No role</SelectItem>
                {jobRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading}>Create Employee</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditUserButton ────────────────────────────────────────────────────────────

export function EditUserButton({ user, jobRoles }: { user: UserData; jobRoles: JobRoleSummary[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [form, setForm] = React.useState({
    name: user.name,
    email: user.email,
    password: "",
    systemRole: user.systemRole,
    jobRoleId: user.jobRoleId ?? "none",
  });

  function setField(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        systemRole: form.systemRole,
        jobRoleId: form.jobRoleId || null,
      };
      if (form.password) payload.password = form.password;

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update user");
      }
      toast("Employee updated", "success");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-accent hover:bg-accent-tint transition-colors"
          title="Edit employee"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update details for {user.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Leave blank to keep current"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            minLength={8}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">System Role</label>
            <Select value={form.systemRole} onValueChange={(v) => setField("systemRole", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRAINEE">Trainee</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Job Role</label>
            <Select value={form.jobRoleId} onValueChange={(v) => setField("jobRoleId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="No role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No role</SelectItem>
                {jobRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── DeleteUserButton ──────────────────────────────────────────────────────────

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      toast(`${userName} has been removed`, "success");
      setOpen(false);
      router.refresh();
    } catch {
      toast("Failed to delete employee", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete employee"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete Employee</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove <strong>{userName}</strong>? All their training
            progress and quiz attempts will be permanently deleted. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} loading={loading}>
            Delete Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CreateJobRoleButton ───────────────────────────────────────────────────────

export function CreateJobRoleButton({ subjects }: { subjects: SubjectSummary[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("#F08A3E");
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([]);

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/job-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, color, subjectIds: selectedSubjects }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create job role");
      }
      toast("Job role created", "success");
      setOpen(false);
      setTitle("");
      setDescription("");
      setColor("#F08A3E");
      setSelectedSubjects([]);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Briefcase className="h-4 w-4" />
          Manage Job Roles
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Job Role</DialogTitle>
          <DialogDescription>
            Define a role and assign subjects that will be auto-assigned to employees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Role Title"
            placeholder="e.g. Field Technician"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            placeholder="Brief description of this role..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Badge Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#F08A3E"
                className="font-mono text-sm"
              />
            </div>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Assign Subjects ({selectedSubjects.length} selected)
              </label>
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                {subjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedSubjects.includes(s.id)}
                      onCheckedChange={() => toggleSubject(s.id)}
                      id={`create-subject-${s.id}`}
                    />
                    <span className="text-sm text-gray-700">{s.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading}>Create Job Role</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditJobRoleButton ─────────────────────────────────────────────────────────

export function EditJobRoleButton({
  role,
  subjects,
}: {
  role: JobRoleData;
  subjects: SubjectSummary[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [title, setTitle] = React.useState(role.title);
  const [description, setDescription] = React.useState(role.description ?? "");
  const [color, setColor] = React.useState(role.color ?? "#F08A3E");
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>(
    role.subjects.map((s) => s.subject.id)
  );

  // Sync when role changes
  React.useEffect(() => {
    if (open) {
      setTitle(role.title);
      setDescription(role.description ?? "");
      setColor(role.color ?? "#F08A3E");
      setSelectedSubjects(role.subjects.map((s) => s.subject.id));
    }
  }, [open, role]);

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/job-roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, color, subjectIds: selectedSubjects }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update job role");
      }
      toast("Job role updated", "success");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-accent hover:bg-accent-tint transition-colors"
          title="Edit job role"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Job Role</DialogTitle>
          <DialogDescription>Update details for "{role.title}".</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Role Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Badge Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#F08A3E"
                className="font-mono text-sm"
              />
            </div>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Assign Subjects ({selectedSubjects.length} selected)
              </label>
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                {subjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedSubjects.includes(s.id)}
                      onCheckedChange={() => toggleSubject(s.id)}
                      id={`edit-subject-${s.id}`}
                    />
                    <span className="text-sm text-gray-700">{s.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── DeleteJobRoleButton ───────────────────────────────────────────────────────

export function DeleteJobRoleButton({ roleId, roleTitle }: { roleId: string; roleTitle: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/job-roles/${roleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job role");
      toast(`"${roleTitle}" has been deleted`, "success");
      setOpen(false);
      router.refresh();
    } catch {
      toast("Failed to delete job role", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete job role"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete Job Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>"{roleTitle}"</strong>? Employees assigned
            to this role will not be removed, but the role assignment will be cleared.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} loading={loading}>
            Delete Job Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── SendInvitesButton ─────────────────────────────────────────────────────────
//
// Lists pending-invite employees and lets the admin either copy each invite
// link manually or fire the (currently no-op) email sender for the whole batch.
// Email sending is a stub today — flip EMAIL_ENABLED + wire a provider in
// lib/email.ts when it's time to release.

interface PendingInvite {
  id: string;
  name: string;
  email: string;
  inviteUrl: string;
  inviteExpires: string | null;
}

export function SendInvitesButton({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [invites, setInvites] = React.useState<PendingInvite[]>([]);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  async function loadInvites() {
    setLoading(true);
    try {
      const res = await fetch("/api/invites/pending");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInvites(data);
    } catch {
      toast("Failed to load pending invites", "error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (open) loadInvites();
  }, [open]);

  async function copyLink(invite: PendingInvite) {
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId((c) => (c === invite.id ? null : c)), 1500);
    } catch {
      toast("Could not copy to clipboard", "error");
    }
  }

  async function sendAll() {
    setSending(true);
    try {
      const res = await fetch("/api/invites/send", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send invites");
      if (data.emailEnabled) {
        toast(`Sent ${data.attempted} invite${data.attempted === 1 ? "" : "s"}`, "success");
      } else {
        toast(
          "Email sending is currently disabled. Use the Copy Link buttons to share invites manually.",
          "warning"
        );
      }
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={pendingCount === 0}>
          <Mail className="h-4 w-4" />
          {pendingCount > 0 ? `Invites (${pendingCount})` : "No Invites"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pending Invites</DialogTitle>
          <DialogDescription>
            Employees waiting to set up their accounts. Send them all an invite email when
            you&apos;re ready to release the app, or copy individual links to share manually.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-gray-500 py-6 text-center">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">No pending invites.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-accent-soft transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.name}</p>
                  <p className="text-xs text-gray-500 truncate">{inv.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(inv)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:border-accent-soft hover:text-accent transition-colors flex-shrink-0"
                  title="Copy invite link"
                >
                  {copiedId === inv.id ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={sendAll} loading={sending} disabled={invites.length === 0}>
            <Send className="h-4 w-4" />
            Send All Invite Emails
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
