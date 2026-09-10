"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileClock,
  Filter,
  Inbox,
  Loader2,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import {
  ApiError,
  fetchDashboardSummary,
  type AuditLogEntry,
  type DashboardMonthlyExpense,
  type DashboardMonthlyOrder,
  type DashboardSummary,
} from "@/lib/admin-api";
import { formatCurrency } from "@/lib/format";

const ACTION_STYLES: Record<AuditLogEntry["action"], string> = {
  CREATE:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  UPDATE:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30",
  DELETE:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30",
};

function formatLogTime(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const quickLinks = [
  {
    label: "Inventory",
    description: "Manage bottles, caps, PET packaging and labels.",
    href: "/admin/inventory/bottles",
    icon: Package,
  },
  {
    label: "Orders",
    description: "Create and manage water orders.",
    href: "/admin/orders",
    icon: ClipboardList,
  },
  {
    label: "Finance",
    description: "Review reports, expenses and transactions.",
    href: "/admin/finance/overview",
    icon: BarChart3,
  },
  {
    label: "Expenses",
    description: "Record and track business expenses.",
    href: "/admin/finance/expenses",
    icon: ReceiptText,
  },
];

const CHART_W = 440;
const CHART_H = 180;
const PAD = { top: 20, right: 12, bottom: 30, left: 52 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function buildAreaPath(
  points: { x: number; y: number }[],
): string {
  if (!points.length) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const cpx1 = prev.x + (cur.x - prev.x) * 0.4;
    const cpx2 = cur.x - (cur.x - prev.x) * 0.4;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${cur.y}, ${cur.x} ${cur.y}`;
  }
  return d;
}

function ExpensesAreaChart({
  months,
}: {
  months: DashboardMonthlyExpense[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxVal = useMemo(() => {
    if (!months.length) return 1;
    return Math.max(...months.map((m) => m.total), 1);
  }, [months]);

  const points = useMemo(
    () =>
      months.map((m, i) => ({
        x: (i / Math.max(months.length - 1, 1)) * INNER_W,
        y: INNER_H - (m.total / maxVal) * INNER_H,
      })),
    [months, maxVal],
  );

  const linePath = useMemo(() => buildAreaPath(points), [points]);
  const areaPath = useMemo(
    () =>
      linePath
        ? `${linePath} L ${points[points.length - 1].x} ${INNER_H} L ${points[0].x} ${INNER_H} Z`
        : "",
    [linePath, points],
  );

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = 0; i <= 4; i++) {
      lines.push((i / 4) * maxVal);
    }
    return lines;
  }, [maxVal]);

  const formatShort = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(v);
  };

  const active = hoverIdx !== null ? months[hoverIdx] : null;

  return (
    <div className="relative">
      {active && (
        <div className="pointer-events-none absolute left-0 top-0 z-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <span className="text-[11px] font-bold text-[#0F172A] dark:text-white">
            {active.label}
          </span>
          <span className="ml-2 text-[11px] font-semibold text-[#2FB9BF]">
            {formatCurrency(active.total)}
          </span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2FB9BF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2FB9BF" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((val, i) => {
          const y = PAD.top + INNER_H - (val / maxVal) * INNER_H;
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={PAD.left + INNER_W}
                y1={y}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 3"
                className="dark:stroke-[#1E293B]"
              />
              <text
                x={PAD.left - 6}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#94A3B8] dark:fill-[#64748B]"
                fontSize="9"
                fontWeight="600"
              >
                {formatShort(val)}
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <g transform={`translate(${PAD.left}, ${PAD.top})`}>
            <path d={areaPath} fill="url(#areaGrad)" />
            <path
              d={linePath}
              fill="none"
              stroke="#2FB9BF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={hoverIdx === i ? 5 : 3.5}
                className={`cursor-pointer transition-all ${
                  hoverIdx === i
                    ? "fill-[#2FB9BF] stroke-white stroke-2"
                    : "fill-[#2FB9BF]"
                }`}
                onMouseEnter={() => setHoverIdx(i)}
              />
            ))}
          </g>
        )}

        {points.map((p, i) => (
          <text
            key={i}
            x={PAD.left + p.x}
            y={CHART_H - 6}
            textAnchor="middle"
            className="fill-[#94A3B8] dark:fill-[#64748B]"
            fontSize="9"
            fontWeight="600"
          >
            {months[i].label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function OrdersBarChart({
  months,
  filter,
  onFilterChange,
}: {
  months: DashboardMonthlyOrder[];
  filter: number;
  onFilterChange: (n: number) => void;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const visible = useMemo(
    () => months.slice(-filter),
    [months, filter],
  );

  const maxVal = useMemo(() => {
    if (!visible.length) return 1;
    return Math.max(...visible.map((m) => m.count), 1);
  }, [visible]);

  const barW = useMemo(
    () => Math.min(48, (INNER_W / visible.length) * 0.65),
    [visible],
  );

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    for (let i = 0; i <= 4; i++) lines.push(Math.round((i / 4) * maxVal));
    return lines;
  }, [maxVal]);

  const totalVisible = visible.reduce((s, m) => s + m.count, 0);

  const active = hoverIdx !== null ? visible[hoverIdx] : null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-[#94A3B8]">
          {totalVisible.toLocaleString()} orders
        </span>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-[#94A3B8]" />
          {[3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onFilterChange(n)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                filter === n
                  ? "bg-[#2FB9BF] text-white"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] dark:bg-[#1E293B] dark:text-[#94A3B8] dark:hover:bg-[#334155]"
              }`}
            >
              {n}m
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="pointer-events-none absolute right-4 top-0 z-10 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]">
          <span className="text-[11px] font-bold text-[#0F172A] dark:text-white">
            {active.label}
          </span>
          <span className="ml-2 text-[11px] font-semibold text-[#2FB9BF]">
            {active.count} orders
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {gridLines.map((val, i) => {
          const y = PAD.top + INNER_H - (val / maxVal) * INNER_H;
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={PAD.left + INNER_W}
                y1={y}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 3"
                className="dark:stroke-[#1E293B]"
              />
              <text
                x={PAD.left - 6}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#94A3B8] dark:fill-[#64748B]"
                fontSize="9"
                fontWeight="600"
              >
                {val}
              </text>
            </g>
          );
        })}

        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {visible.map((m, i) => {
            const x = (i / visible.length) * INNER_W + (INNER_W / visible.length - barW) / 2;
            const h = (m.count / maxVal) * INNER_H;
            const y = INNER_H - h;
            const isActive = hoverIdx === i;
            return (
              <g
                key={m.key}
                onMouseEnter={() => setHoverIdx(i)}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  rx={4}
                  className={`transition-colors ${
                    isActive
                      ? "fill-[#28a9af]"
                      : m.count > 0
                        ? "fill-[#2FB9BF]"
                        : "fill-[#E2E8F0] dark:fill-[#1E293B]"
                  }`}
                />
                {m.count > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 5}
                    textAnchor="middle"
                    className="fill-[#0E7A80] dark:fill-[#5EEAD4]"
                    fontSize="9"
                    fontWeight="700"
                  >
                    {m.count}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {visible.map((m, i) => {
          const x =
            PAD.left +
            (i / visible.length) * INNER_W +
            (INNER_W / visible.length) / 2;
          return (
            <text
              key={m.key}
              x={x}
              y={CHART_H - 6}
              textAnchor="middle"
              className="fill-[#94A3B8] dark:fill-[#64748B]"
              fontSize="9"
              fontWeight="600"
            >
              {m.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersFilter, setOrdersFilter] = useState(6);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to load dashboard data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = [
    {
      label: "Total Budget",
      value: summary ? formatCurrency(summary.budget) : "—",
      hint: "Overall finance budget",
      icon: Wallet,
      accent: "bg-[#2FB9BF]/10 text-[#2FB9BF] ring-[#2FB9BF]/30",
    },
    {
      label: "Inventory Cost",
      value: summary ? formatCurrency(summary.stockInvestment) : "—",
      hint: "All inventories combined",
      icon: Package,
      accent: "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-200 dark:ring-sky-500/30",
    },
    {
      label: "Total Expenses",
      value: summary ? formatCurrency(summary.otherExpenses) : "—",
      hint: "All recorded expenses",
      icon: ReceiptText,
      accent: "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-200 dark:ring-rose-500/30",
    },
    {
      label: "Total Orders",
      value: summary ? String(summary.totalOrders) : "—",
      hint: "All-time orders",
      icon: ShoppingCart,
      accent: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-500/30",
    },
  ];

  return (
    <AdminPage
      title="Dashboard Overview"
      description="A live snapshot of your water business at a glance."
    >
      {error ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <BarChart3 className="h-10 w-10 text-[#CBD5E1]" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 text-sm font-semibold text-white hover:bg-[#28a9af]"
          >
            Retry
          </button>
        </div>
      ) : loading && !summary ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            Loading dashboard…
          </p>
        </div>
      ) : (
        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-5 transition-all duration-200 hover:border-[#2FB9BF]/50 hover:shadow-[0_8px_24px_rgba(47,185,191,0.12)] dark:hover:shadow-none"
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${stat.accent}`}
                >
                  <stat.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8]">
                  {stat.label}
                </p>
                <p className="text-xs text-[#94A3B8] dark:text-[#64748B]">{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E293B] dark:bg-[#0F172A]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-white">
                    <TrendingUp className="h-4 w-4 text-[#2FB9BF]" />
                    Expenses per month
                  </h3>
                  <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Last {summary?.monthlyExpenses.length ?? 0} months
                  </p>
                </div>
                <Link
                  href="/admin/finance/expenses"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2FB9BF] hover:text-[#0E7A80] dark:text-[#5EEAD4]"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {!summary?.monthlyExpenses.length ||
              summary.monthlyExpenses.every((m) => m.total === 0) ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Inbox className="h-8 w-8 text-[#CBD5E1]" />
                  <p className="text-sm text-[#94A3B8]">No expenses recorded yet.</p>
                </div>
              ) : (
                <div className="mt-4">
                  <ExpensesAreaChart months={summary.monthlyExpenses} />
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E293B] dark:bg-[#0F172A]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-white">
                    <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Orders per month
                  </h3>
                  <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Growth over time
                  </p>
                </div>
                <Link
                  href="/admin/orders"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2FB9BF] hover:text-[#0E7A80] dark:text-[#5EEAD4]"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {!summary?.monthlyOrders.length ||
              summary.monthlyOrders.every((m) => m.count === 0) ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Inbox className="h-8 w-8 text-[#CBD5E1]" />
                  <p className="text-sm text-[#94A3B8]">No orders placed yet.</p>
                </div>
              ) : (
                <div className="mt-1">
                  <OrdersBarChart
                    months={summary.monthlyOrders}
                    filter={ordersFilter}
                    onFilterChange={setOrdersFilter}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#0F172A] dark:text-white">
                  <FileClock className="h-4 w-4 text-[#2FB9BF]" />
                  Recent activity
                </h3>
                <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Latest {summary?.recentLogs.length ?? 0} admin actions
                </p>
              </div>
              <Link
                href="/admin/activity-logs"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2FB9BF] hover:text-[#0E7A80] dark:text-[#5EEAD4]"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {!summary?.recentLogs.length ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <FileClock className="h-8 w-8 text-[#CBD5E1]" />
                <p className="text-sm text-[#94A3B8]">No activity yet.</p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                {summary.recentLogs.map((log) => (
                  <li key={log.id} className="flex items-center gap-3 py-3">
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${ACTION_STYLES[log.action]}`}
                    >
                      {log.action}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold capitalize text-[#0F172A] dark:text-white">
                        {log.targetModule.replace(/-/g, " ")}
                        <span className="ml-1 font-medium text-[#64748B] dark:text-[#94A3B8]">
                          · {log.itemLabel ?? `#${log.itemId.slice(-6)}`}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-[#0F172A] dark:text-white">
                        {log.adminName}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">
                        {formatLogTime(log.timestamp)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[#E2E8F0] dark:border-[#1E293B] pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
              Quick actions
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map((quickLink) => (
                <Link
                  key={quickLink.href}
                  href={quickLink.href}
                  className="group rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-5 transition-all duration-200 hover:border-[#2FB9BF]/50 hover:bg-white dark:hover:bg-[#0F172A] hover:shadow-[0_8px_24px_rgba(47,185,191,0.12)] dark:hover:shadow-none"
                >
                  <div className="flex items-center justify-between">
                    <quickLink.icon className="h-6 w-6 text-[#2FB9BF]" />
                    <ArrowRight className="h-4 w-4 text-[#CBD5E1] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#2FB9BF]" />
                  </div>
                  <p className="mt-4 text-sm font-bold text-[#0F172A] dark:text-white">
                    {quickLink.label}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                    {quickLink.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
