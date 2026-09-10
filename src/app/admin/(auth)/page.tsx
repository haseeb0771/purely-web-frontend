"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { loginAdmin } from "@/lib/admin-api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Please enter both your email and password.");
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(normalizedEmail, password);
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
      setLoading(false);
    }
  }

  const inputClasses =
    "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] py-3 pl-11 pr-4 text-[15px] text-[#0F172A] dark:text-white placeholder-[#94A3B8] dark:placeholder-[#64748B] outline-none transition-colors duration-200 focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1E293B] focus:ring-4 focus:ring-[#2FB9BF]/10";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0B131B] bg-grid px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-white/70 dark:from-[#0F172A]/40 dark:via-transparent dark:to-[#0F172A]/40" />

      <section className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo className="h-10 w-auto" />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#1E293B] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#475569] dark:text-[#94A3B8] shadow-sm dark:shadow-none">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2FB9BF]" />
            SECURE ADMIN PORTAL
          </div>
          <p className="mt-3 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Authorized personnel only. Access is monitored and protected.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:shadow-none"
          noValidate
        >
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">
            Sign in to Purely
          </h1>
          <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Manage your brand from one secure dashboard.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@purely.com"
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className={inputClasses}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#64748B] dark:text-[#94A3B8] transition-colors hover:text-[#0F172A] dark:hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_20px_rgba(47,185,191,0.35)] transition-all duration-200 hover:bg-[#27A6AC] hover:shadow-[0_10px_24px_rgba(47,185,191,0.45)] focus:outline-none focus:ring-4 focus:ring-[#2FB9BF]/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#94A3B8] dark:text-[#64748B]">
          Protected by encrypted session cookies (JWT, HTTP-only).
        </p>
      </section>
    </main>
  );
}