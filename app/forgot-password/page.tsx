"use client";
import * as React from "react";
import Link from "next/link";
import { GraduationCap, Mail, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="leading-tight">
            <p className="pa-wordmark text-2xl">Paradise</p>
            <span className="text-n-900 text-base font-bold">Academy</span>
          </div>
        </div>

        {sent ? (
          <>
            <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <MailCheck className="h-7 w-7 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-n-900 mb-2">Check your email</h2>
            <p className="text-muted text-sm mb-2">
              If an account exists for{" "}
              <span className="font-medium text-n-700">{email}</span>, we&apos;ve sent a link to
              reset your password.
            </p>
            <p className="text-muted-foreground text-xs mb-8">
              The link expires in 1 hour. Don&apos;t see it? Check your spam folder.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-n-900 mb-1">Forgot your password?</h2>
            <p className="text-muted text-sm mb-8">
              Enter the email you use to sign in and we&apos;ll send you a link to reset your
              password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                icon={<Mail className="h-4 w-4" />}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-2">
                Send Reset Link
              </Button>
            </form>

            <Link
              href="/login"
              className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-n-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
