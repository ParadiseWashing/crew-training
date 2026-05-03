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
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Lock className="h-4 w-4 text-blue-600" />
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

function DangerZone() {
  const { toast } = useToast();

  function handleExport() {
    toast("Data export is not yet configured. Contact your system administrator.", "info");
  }

  return (
    <div className="space-y-6">
      {/* Data export */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Download className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle>Export Data</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Download a full export of all training records and progress data.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            The export will include all users, assignments, quiz attempts, and step progress
            in CSV format. This operation may take a few moments for large datasets.
          </p>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export All Data
          </Button>
        </CardContent>
      </Card>

      {/* Reset instructions */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-red-700">Danger Zone</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Irreversible actions that affect all data. Proceed with extreme caution.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Reset progress */}
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Reset All Training Progress
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Deletes all step progress, quiz attempts, and assignment progress for
                    every user. Assignments themselves are preserved. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() =>
                    toast(
                      "To reset progress, run the database migration manually. This action is disabled in the UI for safety.",
                      "warning"
                    )
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Progress
                </Button>
              </div>
            </div>

            {/* Delete all users */}
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Delete All Trainee Accounts
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Permanently removes all trainee user accounts and their associated
                    records. Admin accounts are not affected. Cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() =>
                    toast(
                      "To bulk-delete trainees, use the People page or run a database operation directly.",
                      "warning"
                    )
                  }
                >
                  <AlertTriangle className="h-4 w-4" />
                  Delete Trainees
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Dangerous operations are intentionally disabled in the UI. To perform them,
              access the database directly or use the CLI tools provided with this project.
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
