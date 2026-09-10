"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  Boxes,
  ReceiptText,
  TrendingUp,
  Loader2,
  Plus,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import SelectDropdown, { type SelectOption } from "@/components/admin/SelectDropdown";
import NumberInput from "@/components/admin/NumberInput";
import {
  ApiError,
  fetchFinanceSummary,
  fetchExpenseCategories,
  createExpenseCategory,
  fetchExpenses,
  createExpense,
  deleteExpense,
  type FinanceSummary,
  type ExpenseCategory,
  type ExpenseRecord,
} from "@/lib/admin-api";
import { formatCurrency } from "@/lib/format";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:placeholder:text-[#64748B]";

interface SummaryCard {
  label: string;
  value: number;
  icon: typeof Wallet;
  accent: string;
  iconBg: string;
  hint?: string;
}

function SummaryCard({ card }: { card: SummaryCard }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E293B] dark:bg-[#0F172A]">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
          <card.icon className="h-5 w-5 text-[#2FB9BF]" />
        </span>
        <p className="text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
          {card.label}
        </p>
      </div>
      <p className={`mt-3 text-2xl font-bold ${card.accent}`}>
        {formatCurrency(card.value)}
      </p>
      {card.hint && (
        <p className="mt-1 text-xs text-[#94A3B8]">{card.hint}</p>
      )}
    </div>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function FinanceExpensesPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [showNewName, setShowNewName] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameError, setNewNameError] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState(false);

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchFinanceSummary();
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to load finance summary.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchExpenseCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadExpenses = useCallback(
    async (targetPage: number) => {
      const result = await fetchExpenses({ page: targetPage, pageSize: 20 });
      setExpenses(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages || 1);
      setPage(targetPage);
    },
    []
  );

  useEffect(() => {
    void loadSummary();
    void loadCategories();
    void loadExpenses(1);
  }, [loadSummary, loadCategories, loadExpenses]);

  const categoryOptions: SelectOption[] = categories.map((c) => ({
    label: c.name,
    value: c.name,
  }));

  async function handleAddNewName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewNameError(null);
    const name = newName.trim();
    if (!name) {
      setNewNameError("Expense name is required.");
      return;
    }
    setCreatingName(true);
    try {
      const created = await createExpenseCategory({ name });
      setCategories((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedCategory(created.name);
      setShowNewName(false);
      setNewName("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNewNameError("This expense name already exists.");
      } else {
        setNewNameError("Failed to create expense name.");
      }
    } finally {
      setCreatingName(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const value = amount;
    if (!selectedCategory) {
      setFormError("Please select or add an expense name.");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      setFormError("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      await createExpense({
        category: selectedCategory,
        amount: value,
        note: note.trim() || undefined,
      });
      setAmount(0);
      setNote("");
      await Promise.all([loadSummary(), loadExpenses(1)]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFormError("Session expired. Please log in again.");
      } else {
        setFormError("Failed to record expense.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteExpense(id);
      await Promise.all([loadSummary(), loadExpenses(page)]);
    } catch {
      setDeletingId(null);
    }
  }

  const summaryCards: SummaryCard[] = [
    {
      label: "Total Budget",
      value: summary?.budget ?? 0,
      icon: Wallet,
      accent: "text-[#2FB9BF]",
      iconBg: "bg-[#2FB9BF]/10",
      hint: "Configure in Settings",
    },
    {
      label: "Stock Investment",
      value: summary?.stockInvestment ?? 0,
      icon: Boxes,
      accent: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-500/10",
      hint: "Value of current inventory",
    },
    {
      label: "Other Expenses",
      value: summary?.otherExpenses ?? 0,
      icon: ReceiptText,
      accent: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10",
      hint: "Recorded expenses",
    },
    {
      label: "Profit / Remaining",
      value: summary?.profit ?? 0,
      icon: TrendingUp,
      accent: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
      hint: "Budget minus investments & expenses",
    },
  ];

  return (
    <AdminPage
      title="Manage Expenses"
      description="Track your budget, stock investment and other expenses."
    >
      {error ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <ReceiptText className="h-10 w-10 text-[#CBD5E1]" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">{error}</p>
        </div>
      ) : (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.label} card={card} />
            ))}
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2FB9BF]/10">
                <ReceiptText className="h-5 w-5 text-[#2FB9BF]" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                  Record Other Expense
                </h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Add a one-off expense like transport, utilities or raw materials.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                  Expense Name
                </label>
                <SelectDropdown
                  value={selectedCategory}
                  placeholder="Select an expense name"
                  options={categoryOptions}
                  onSelect={setSelectedCategory}
                  actionLabel="+ Add new expense name"
                  onAction={() => setShowNewName(true)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                  Amount
                </label>
                <NumberInput
                  value={amount}
                  onValueChange={setAmount}
                  placeholder="e.g. 5000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                  Note <span className="text-[#94A3B8]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. transport for delivery"
                  className={inputClass}
                />
              </div>
              <div className="flex items-end sm:col-span-3">
                {formError && (
                  <div className="mr-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    {formError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2FB9BF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4] disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Save expense
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 dark:border-[#1E293B]">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Expenses
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {total} recorded
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Note</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Recorded By</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#2FB9BF]" />
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#94A3B8]">
                        No expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                      >
                        <td className="px-5 py-4 text-sm font-semibold capitalize text-[#0F172A] dark:text-white">
                          {expense.category}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#64748B] dark:text-[#94A3B8]">
                          {expense.note ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#64748B] dark:text-[#94A3B8]">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-5 py-4 text-sm text-[#64748B] dark:text-[#94A3B8]">
                          {expense.recordedByName}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            aria-label="Delete expense"
                            disabled={deletingId === expense.id}
                            onClick={() => void handleDelete(expense.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#94A3B8] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-[#334155] dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            {deletingId === expense.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-[#E2E8F0] px-5 py-3 dark:border-[#1E293B]">
                <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => void loadExpenses(page - 1)}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 disabled:opacity-40 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => void loadExpenses(page + 1)}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 disabled:opacity-40 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showNewName && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowNewName(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl dark:border-[#1E293B] dark:bg-[#0F172A]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 dark:border-[#1E293B]">
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                Add expense name
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowNewName(false)}
                className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:hover:bg-[#1E293B] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddNewName} className="space-y-4 p-5">
              {newNameError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  {newNameError}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                  Expense name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Utilities, Transport, Raw Material"
                  className={inputClass}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewName(false)}
                  className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingName}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4] disabled:opacity-60"
                >
                  {creatingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPage>
  );
}