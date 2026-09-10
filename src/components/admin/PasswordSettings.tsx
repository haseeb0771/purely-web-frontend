"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { ApiError, changePassword } from "@/lib/admin-api";
import { useToast } from "@/components/admin/toast";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:placeholder:text-[#64748B]";

export default function PasswordSettings() {
  const [current, setCurrent] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!current) {
      setError("Please enter your current password.");
      return;
    }
    if (nextPassword.length < 10) {
      setError("New password must be at least 10 characters.");
      return;
    }
    if (nextPassword !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: nextPassword });
      toast.success("Password changed successfully.");
      setCurrent("");
      setNextPassword("");
      setConfirm("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to change password.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-5 transition-all duration-200 hover:border-[#2FB9BF]/50">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#0F172A] ring-1 ring-[#2FB9BF]/30">
        <KeyRound className="h-5 w-5 text-[#2FB9BF]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
          Security & password
        </h2>
        <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Rotate your credentials to keep the panel locked down.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                Current password
              </span>
              <PasswordInput value={current} onChange={setCurrent} show={show} onToggle={() => setShow((s) => !s)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                New password
              </span>
              <PasswordInput value={nextPassword} onChange={setNextPassword} show={show} onToggle={() => setShow((s) => !s)} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                Confirm new password
              </span>
              <PasswordInput value={confirm} onChange={setConfirm} show={show} onToggle={() => setShow((s) => !s)} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {error && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4] disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Change password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••••"
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        aria-label={show ? "Hide password" : "Show password"}
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] transition-colors hover:text-[#0F172A] dark:hover:text-white"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}