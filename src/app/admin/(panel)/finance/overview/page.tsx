"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Wallet,
  Boxes,
  ReceiptText,
  TrendingUp,
  Coins,
  Clock,
  Loader2,
  Inbox,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import {
  ApiError,
  fetchFinanceSummary,
  type FinanceSummary,
} from "@/lib/admin-api";
import { formatCurrency } from "@/lib/format";

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
  iconBg,
}: {
  label: string;
  value: number;
  icon: typeof Wallet;
  accent: string;
  iconBg: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E293B] dark:bg-[#0F172A]">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5 text-[#2FB9BF]" />
        </span>
        <p className="text-sm font-semibold text-[#64748B] dark:text-[#94A3B8]">
          {label}
        </p>
      </div>
      <p className={`mt-3 text-2xl font-bold ${accent}`}>{formatCurrency(value)}</p>
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

const CATEGORY_COLORS = [
  "bg-[#2FB9BF]",
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-emerald-500",
];

export default function FinanceOverviewPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchFinanceSummary();
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to load finance data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxCategoryTotal = useMemo(() => {
    if (!summary?.byCategory.length) return 0;
    return Math.max(...summary.byCategory.map((c) => c.total), 1);
  }, [summary]);

  const cards = [
    {
      label: "Total Budget",
      value: summary?.budget ?? 0,
      icon: Wallet,
      accent: "text-[#2FB9BF]",
      iconBg: "bg-[#2FB9BF]/10",
    },
    {
      label: "Stock Investment",
      value: summary?.stockInvestment ?? 0,
      icon: Boxes,
      accent: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-500/10",
    },
    {
      label: "Other Expenses",
      value: summary?.otherExpenses ?? 0,
      icon: ReceiptText,
      accent: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-500/10",
    },
    {
      label: "Payments Received",
      value: summary?.collections ?? 0,
      icon: Coins,
      accent: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "Pending Collections",
      value: summary?.pendingCollections ?? 0,
      icon: Clock,
      accent: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "Profit / Remaining",
      value: summary?.profit ?? 0,
      icon: TrendingUp,
      accent: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
  ];

  return (
    <AdminPage
      title="Overview & Reports"
      description="Revenue, budget allocation and expenses at a glance."
    >
      {error ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <BarChart3 className="h-10 w-10 text-[#CBD5E1]" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">{error}</p>
        </div>
      ) : loading && !summary ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            Loading reports…
          </p>
        </div>
      ) : (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <SummaryCard key={card.label} {...card} />
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="border-b border-[#E2E8F0] px-5 py-4 dark:border-[#1E293B]">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Pending payments
              </h3>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Delivered orders with an outstanding balance (top 10 by bill)
              </p>
            </div>
            {!summary?.pendingPayments?.length ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <Inbox className="h-8 w-8 text-[#CBD5E1]" />
                <p className="text-sm text-[#94A3B8]">
                  No pending payments. Everything is settled.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:border-[#1E293B] dark:text-[#94A3B8]">
                      <th className="px-5 py-3">Order</th>
                      <th className="px-5 py-3">Business</th>
                      <th className="px-5 py-3 text-right">Bill</th>
                      <th className="px-5 py-3 text-right">Paid</th>
                      <th className="px-5 py-3 text-right">Pending</th>
                      <th className="px-5 py-3">Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                    {summary.pendingPayments.map((payment) => (
                      <tr key={payment.orderId} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]">
                        <td className="px-5 py-3">
                          <span className="rounded-lg bg-[#E6F7F8] dark:bg-[#163A3B] px-2.5 py-1 font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4] ring-1 ring-[#2FB9BF]/30">
                            {payment.orderId}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-[#0F172A] dark:text-white">
                          {payment.businessName}
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-[#64748B] dark:text-[#94A3B8]">
                          {formatCurrency(payment.totalBill)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(payment.totalPaid)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(payment.pendingAmount)}
                        </td>
                        <td className="px-5 py-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                          {formatDate(payment.deliveredAt ?? undefined)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E293B] dark:bg-[#0F172A]">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Expenses by category
              </h3>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Share of total other expenses
              </p>

              {!summary?.byCategory.length ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Inbox className="h-8 w-8 text-[#CBD5E1]" />
                  <p className="text-sm text-[#94A3B8]">No expenses recorded yet.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {summary.byCategory.map((c, index) => (
                    <div key={c.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold capitalize text-[#0F172A] dark:text-white">
                          {c.category}
                        </span>
                        <span className="font-bold text-[#475569] dark:text-[#94A3B8]">
                          {formatCurrency(c.total)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-[#1E293B]">
                        <div
                          className={`h-full rounded-full ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`}
                          style={{
                            width: `${Math.max(4, (c.total / maxCategoryTotal) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#94A3B8]">{c.count} record{c.count > 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E293B] dark:bg-[#0F172A]">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Recent expenses
              </h3>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Latest recorded other expenses
              </p>

              {!summary?.recentExpenses?.length ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Inbox className="h-8 w-8 text-[#CBD5E1]" />
                  <p className="text-sm text-[#94A3B8]">No expenses recorded yet.</p>
                </div>
              ) : (
                <ul className="mt-5 divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                  {summary.recentExpenses.map((expense) => (
                    <li key={expense.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold capitalize text-[#0F172A] dark:text-white">
                          {expense.category}
                        </p>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                          {expense.recordedByName} · {formatDate(expense.date)}
                        </p>
                      </div>
                      <span className="shrink-0 font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(expense.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}