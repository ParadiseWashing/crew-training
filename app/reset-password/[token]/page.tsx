"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { GraduationCap, Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ResetData {
  name: string;
  email: string;
}

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [account, setAccount] = React.useState<ResetData | null>(null);
  const [validating, setValidating] = React.useState(true);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/password-reset/${params.token}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setValidationError(data.error ?? "This reset link is invalid or has expired.");
        } else {
          setAccount(data);
        }
      } catch {
        if (!cancelled) setValidationError("Could not load this reset link.");
      } finally {
        if (!cancelled) setValidating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
      const res = await fetch(`/api/password-reset/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not reset your password.");
        setSubmitting(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: data.email ?? account!.email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        toast("Password updated. Please sign in.", "success");
        router.push("/login");
        return;
      }

      toast("Password updated. Welcome back!", "success");

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      router.push(session?.user?.systemRole === "ADMIN" ? "/admin/dashboard" : "/trainee/home");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-sm text-muted">Checking your reset link…</div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-6">
        <div className="w-full max-w-sm text-center">
          <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-n-900 mb-2">Link unavailable</h1>
          <p className="text-sm text-muted mb-6">{validationError}</p>
          <Button variant="outline" onClick={() => router.push("/forgot-password")} className="w-full">
            Request a New Link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-pw-black flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        <div className="max-w-md relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/30">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div className="leading-tight">
              <p className="pa-wordmark text-3xl">Paradise</p>
              <h1 className="text-white text-xl font-bold -mt-1">Academy</h1>
              <p className="text-white/50 text-xs">Professional Cleaning</p>
            </div>
          </div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Let&apos;s get you<br />back in.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Choose a new password and you&apos;ll be signed straight back into your training portal.
          </p>
          <div className="mt-10 flex items-center gap-3 text-white/70 text-sm">
            <ShieldCheck className="h-5 w-5 text-success" />
            <span>Reset link verified</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-card">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shadow-sm">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <p className="pa-wordmark text-2xl">Paradise</p>
              <span className="text-n-900 text-base font-bold">Academy</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-n-900 mb-1">Choose a new password</h2>
          <p className="text-muted text-sm mb-2">
            Hi <span className="font-medium text-n-700">{account?.name}</span>
            {" — pick something you'll remember."}
          </p>
          <p className="text-muted-foreground text-xs mb-8">
            Resetting the password for <span className="font-mono">{account?.email}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-n-700">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border-strong bg-card pl-10 pr-10 py-2 text-sm text-n-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-n-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-n-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-border-strong bg-card pl-10 pr-3 py-2 text-sm text-n-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" loading={submitting} className="w-full mt-2">
              Reset Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
