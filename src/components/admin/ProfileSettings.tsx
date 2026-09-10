"use client";

import { useEffect, useState } from "react";
import { Loader2, UserCircle } from "lucide-react";
import { ApiError, fetchAdminMe, updateProfile } from "@/lib/admin-api";
import { useToast } from "@/components/admin/toast";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:placeholder:text-[#64748B]";

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetchAdminMe();
        setName(me.name);
        setEmail(me.email);
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({ name: name.trim(), email: email.trim() });
      setName(updated.name);
      setEmail(updated.email);
      toast.success("Profile updated successfully.");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 409)) {
        setError(err.message);
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-5 transition-all duration-200 hover:border-[#2FB9BF]/50">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#0F172A] ring-1 ring-[#2FB9BF]/30">
        <UserCircle className="h-5 w-5 text-[#2FB9BF]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
          Profile
        </h2>
        <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Manage your personal details and contact information.
        </p>

        {loading ? (
          <div className="mt-4 flex h-11 w-48 items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
            <Loader2 className="h-4 w-4 animate-spin text-[#2FB9BF]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  Name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ali"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@company.com"
                  className={inputClass}
                />
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
                  <UserCircle className="h-4 w-4" />
                )}
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}