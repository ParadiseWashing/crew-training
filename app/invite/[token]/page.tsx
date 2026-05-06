"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { GraduationCap, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface InviteData {
  name: string;
  email: string;
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [invite, setInvite] = React.useState<InviteData | null>(null);
  const [validating, setValidating] = React.useState(true);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  // Validate token on mount
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/invite/${params.token}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setValidationError(data.error ?? "Invalid invite link");
        } else {
          setInvite(data);
        }
      } catch {
        if (!cancelled) setValidationError("Could not load invite");
      } finally {
        if (!cancelled) setValidating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invite/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not set password");
        setSubmitting(false);
        return;
      }

      // Auto-login
      const signInRes = await signIn("credentials", {
        email: invite!.email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        toast("Account created. Please sign in.", "success");
        router.push("/login");
        return;
      }

      toast(`Welcome, ${invite!.name}!`, "success");

      // Determine where to go based on session
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      router.push(session?.user?.systemRole === "ADMIN" ? "/admin/dashboard" : "/trainee/home");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // ── Validation states ─────────────────────────────────────────────────────
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading invite…</div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invite unavailable</h1>
          <p className="text-sm text-gray-500 mb-6">{validationError}</p>
          <Button variant="outline" onClick={() => router.push("/login")} className="w-full">
            Go to Sign In
          </Button>
        </div>
      </div>
    );
  }

  // ── Set password form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1E2A3A] flex-col justify-center px-16">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">Crew Training</h1>
              <p className="text-white/50 text-sm">Professional Cleaning</p>
            </div>
          </div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Welcome aboard,<br />{invite?.name?.split(" ")[0]}.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Set your password to access your training portal and start learning.
          </p>
          <div className="mt-10 flex items-center gap-3 text-white/70 text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span>Account verified</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-gray-900 text-xl font-bold">Crew Training</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Set your password</h2>
          <p className="text-gray-500 text-sm mb-2">
            Hi <span className="font-medium text-gray-700">{invite?.name}</span> — you're almost in.
          </p>
          <p className="text-gray-400 text-xs mb-8">
            Signing in as <span className="font-mono">{invite?.email}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-10 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full mt-2">
              Activate Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
