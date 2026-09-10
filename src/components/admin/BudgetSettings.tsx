"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Wallet } from "lucide-react";
import NumberInput from "@/components/admin/NumberInput";
import { fetchBudget, updateBudget } from "@/lib/admin-api";
import { useToast } from "@/components/admin/toast";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:placeholder:text-[#64748B]";

export default function BudgetSettings() {
  const [budget, setBudget] = useState<number>(0);
  const [value, setValue] = useState<number>(0);
  const [addAmount, setAddAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    void (async () => {
      try {
        const current = await fetchBudget();
        const amount = current ?? 0;
        setBudget(amount);
        setValue(amount);
      } catch {
        setError("Failed to load budget.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveAmount(amount: number) {
    setError(null);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Please enter a valid budget amount.");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateBudget(amount);
      setBudget(saved ?? 0);
      setValue(saved ?? 0);
      toast.success("Budget updated successfully.");
    } catch {
      setError("Failed to save budget.");
    } finally {
      setSaving(false);
    }
  }

  function handleReplace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void saveAmount(value);
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!Number.isFinite(addAmount) || addAmount <= 0) {
      setError("Please enter a positive amount to add.");
      return;
    }
    const newTotal = budget + addAmount;
    void saveAmount(newTotal);
    setAddAmount(0);
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-5 transition-all duration-200 hover:border-[#2FB9BF]/50">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30">
          <Wallet className="h-5 w-5 text-[#2FB9BF]" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
            Business Budget
          </h2>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
            Set or adjust your total available budget for the business.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex h-16 items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
          <Loader2 className="h-5 w-5 animate-spin text-[#2FB9BF]" />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-[#2FB9BF]/20 bg-[#2FB9BF]/5 px-5 py-4 dark:border-[#2FB9BF]/15 dark:bg-[#163A3B]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#0E7A80] dark:text-[#5EEAD4]">
              Current Budget
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#0F172A] dark:text-white">
              Rs. {budget.toLocaleString()}
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <form onSubmit={handleReplace} className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-500/10 ring-1 ring-sky-200 dark:ring-sky-500/30">
                  <Save className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                </span>
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  Set Total Budget
                </p>
              </div>
              <p className="mb-3 text-[11px] text-[#94A3B8]">
                Overwrite the current budget with a new value.
              </p>
              <div className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Amount (PKR)
                  </span>
                  <NumberInput
                    value={value}
                    onValueChange={setValue}
                    placeholder="e.g. 5,000,000"
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving || value === budget}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2FB9BF] px-4 text-xs font-bold text-white transition-colors hover:bg-[#28a9af] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </button>
              </div>
            </form>

            <form onSubmit={handleAdd} className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200 dark:ring-emerald-500/30">
                  <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </span>
                <p className="text-xs font-bold text-[#0F172A] dark:text-white">
                  Add Funds
                </p>
              </div>
              <p className="mb-3 text-[11px] text-[#94A3B8]">
                Top up your budget without losing the existing amount.
              </p>
              <div className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Amount (PKR)
                  </span>
                  <NumberInput
                    value={addAmount}
                    onValueChange={setAddAmount}
                    placeholder="e.g. 250,000"
                    min={0}
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving || !addAmount || addAmount <= 0}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
