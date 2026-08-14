"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import {
  Settings,
  Shield,
  AlertTriangle,
  Download,
  RefreshCw,
  Save,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── General Settings ──────────────────────────────────────────────────────────

function GeneralSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [companyName, setCompanyName] = React.useState("My Company");
  const [appDescription, setAppDescription] = React.useState(
    "Employee training and onboarding platform."
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Simulate save — wire to a real API endpoint when ready
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast("Settings saved", "success");
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Basic information displayed throughout the app.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Company / Organization Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Company Name"
          />
          <Textarea
            label="App Description"
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            placeholder="Brief description shown on the login page."
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </form>
  );
}

// ─── Security Settings ─────────────────────────────────────────────────────────

function SecuritySettings() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [form, setForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  function setField(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.newPassword.length < 8) {
      toast("New password must be at least 8 characters", "error");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }
    if (!session?.user?.id) {
      toast("Session expired — please log in again", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update password");
      }
      toast("Password updated successfully", "success");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent-tint flex items-center justify-center">
              <Lock className="h-4 w-4 text-accent" />
            </div>
            <div>
              <CardTitle>Change Password</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Update the password for your admin account.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {/* Current password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Enter current password"
                  value={form.currentPassword}
                  onChange={(e) => setField("currentPassword", e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Minimum 8 characters"
                  value={form.newPassword}
                  onChange={(e) => setField("newPassword", e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Re-enter new password"
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" loading={saving}>
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Shield className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <CardTitle>Session & Access</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                How authentication works in this application.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-600">Authentication method</dt>
              <dd className="font-medium text-gray-900">Email + password (JWT)</dd>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-600">Session strategy</dt>
              <dd className="font-medium text-gray-900">JWT (stateless)</dd>
            </div>
            <div className="flex items-center justify-between py-2">
              <dt className="text-gray-600">Password hashing</dt>
              <dd className="font-medium text-gray-900">bcrypt (cost 12)</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Danger Zone ───────────────────────────────────────────────────────────────

const CSV_DATASETS: { key: string; label: string }[] = [
  { key: "users", label: "People" },
  { key: "assignments", label: "Assignments" },
  { key: "quiz-attempts", label: "Quiz Attempts" },
  { key: "step-progress", label: "Step Progress" },
  { key: "sign-offs", label: "Module Sign-Offs" },
  { key: "weekly-sign-offs", label: "Weekly Sign-Offs" },
  { key: "handbook-signatures", label: "Signatures" },
  { key: "working-interviews", label: "Working Interviews" },
  { key: "audit-flags", label: "Audit Flags" },
  { key: "admin-actions", label: "Admin Action Log" },
];

/** A destructive action gated behind typing an exact confirmation phrase. */
function DangerAction({
  title,
  description,
  bullets,
  confirmPhrase,
  endpoint,
  buttonLabel,
  icon,
  onDone,
}: {
  title: string;
  description: string;
  bullets: string[];
  confirmPhrase: string;
  endpoint: string;
  buttonLabel: string;
  icon: React.ReactNode;
  onDone: (message: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setOpen(false);
      setValue("");
      onDone(
        typeof data.deleted === "number"
          ? `Deleted ${data.deleted} trainee account${data.deleted === 1 ? "" : "s"}.`
          : `Cleared ${data.stepCount ?? 0} step completions and ${data.attemptCount ?? 0} quiz attempts.`
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-800">{title}</p>
          <p className="text-xs text-red-600 mt-0.5">{description}</p>
        </div>
        {!open && (
          <Button
            variant="destructive"
            size="sm"
            className="flex-shrink-0"
            onClick={() => setOpen(true)}
          >
            {icon}
            {buttonLabel}
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-4 rounded-lg border border-red-200 bg-white p-4 space-y-3">
          <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="text-xs text-gray-600">
            Type <span className="font-mono font-semibold text-red-700">{confirmPhrase}</span> to
            confirm. This is recorded in the admin action log.
          </p>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={confirmPhrase}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              loading={loading}
              disabled={value !== confirmPhrase}
              onClick={run}
            >
              {icon}
              {buttonLabel}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setValue("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DangerZone() {
  const { toast } = useToast();

  function download(dataset: string) {
    window.location.href = `/api/admin/export?dataset=${encodeURIComponent(dataset)}`;
  }

  return (
    <div className="space-y-6">
      {/* Data export */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent-tint flex items-center justify-center">
              <Download className="h-4 w-4 text-accent" />
            </div>
            <div>
              <CardTitle>Export Data</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Download training records for your files, an audit, or a backup.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button onClick={() => download("all")}>
              <Download className="h-4 w-4" />
              Download Full Backup (JSON)
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              One file containing every dataset below, including the full detail of ratings and
              notes.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Individual spreadsheets (CSV)
            </p>
            <div className="flex flex-wrap gap-2">
              {CSV_DATASETS.map((d) => (
                <Button
                  key={d.key}
                  variant="outline"
                  size="sm"
                  onClick={() => download(d.key)}
                  className="text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Destructive actions */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-red-700">Danger Zone</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Irreversible actions that affect all data. Export a backup first.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <DangerAction
              title="Reset All Training Progress"
              description="Puts every trainee back to the start of their assigned modules."
              bullets={[
                "Deletes all step completions and quiz attempts for every user",
                "Clears all open audit flags",
                "Rewinds every assignment to Not Started at 0%",
                "Signed records are kept — module sign-offs, weekly sign-offs, handbook signatures and working interviews are untouched",
              ]}
              confirmPhrase="RESET ALL PROGRESS"
              endpoint="/api/admin/danger/reset-progress"
              buttonLabel="Reset Progress"
              icon={<RefreshCw className="h-4 w-4" />}
              onDone={(msg) => toast(msg, "success")}
            />

            <DangerAction
              title="Delete All Trainee Accounts"
              description="Removes the entire trainee roster. Admin accounts are not affected."
              bullets={[
                "Permanently deletes every account with the Trainee role",
                "Their progress, assignments, quiz attempts, sign-offs and signed handbook records go with them",
                "A snapshot of who was deleted is written to the admin action log",
                "Anyone deleted will need to be re-invited from scratch",
              ]}
              confirmPhrase="DELETE ALL TRAINEES"
              endpoint="/api/admin/danger/delete-trainees"
              buttonLabel="Delete Trainees"
              icon={<AlertTriangle className="h-4 w-4" />}
              onDone={(msg) => toast(msg, "success")}
            />

            <p className="text-xs text-gray-400">
              Every action here is recorded in the admin action log, viewable under Activity and
              downloadable above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your application configuration and account security."
      />

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-1.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-1.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="danger">
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="danger">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
