"use client";
import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    // Fetch session to determine role
    const res = await fetch("/api/auth/session");
    const session = await res.json();

    if (session?.user?.systemRole === "ADMIN") {
      router.push("/admin/dashboard");
    } else {
      router.push("/trainee/home");
    }

    toast("Welcome back!", "success");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-pw-black flex-col justify-center px-16 relative overflow-hidden">
        {/* Subtle orange glow accent */}
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
            Train smarter.<br />Clean better.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Your complete onboarding and training platform. Learn SOPs, pass quizzes, and track your progress — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: "Training Modules", value: "12+" },
              { label: "Active Crew", value: "24" },
              { label: "Avg Completion", value: "87%" },
              { label: "Quizzes Passed", value: "200+" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-accent">{stat.value}</p>
                <p className="text-white/50 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shadow-sm">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <p className="pa-wordmark text-2xl">Paradise</p>
              <span className="text-n-900 text-base font-bold">Academy</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-n-900 mb-1">Welcome back</h2>
          <p className="text-muted text-sm mb-8">Sign in to your training account</p>

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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-n-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Contact your manager if you need access.
          </p>

          <div className="mt-8 p-4 bg-n-50 rounded-xl border border-border text-xs text-muted">
            <p className="font-medium text-n-700 mb-2">Demo Accounts:</p>
            <p>Admin: <span className="font-mono">admin@crewtraining.com</span> / <span className="font-mono">admin123</span></p>
            <p>Trainee: <span className="font-mono">crew@crewtraining.com</span> / <span className="font-mono">crew123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
