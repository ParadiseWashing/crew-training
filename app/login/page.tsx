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
              <div key={stat.label} className="bg-white/10 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
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
            <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-gray-900 text-xl font-bold">Crew Training</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your training account</p>

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
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Contact your manager if you need access.
          </p>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
            <p className="font-medium text-gray-600 mb-2">Demo Accounts:</p>
            <p>Admin: <span className="font-mono">admin@crewtraining.com</span> / <span className="font-mono">admin123</span></p>
            <p>Trainee: <span className="font-mono">crew@crewtraining.com</span> / <span className="font-mono">crew123</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
