"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Clock,
  CircleCheck,
  CircleX,
  Layers,
  Loader2,
  Search,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import EmptyState from "@/components/admin/EmptyState";
import {
  ApiError,
  fetchLabelOrders,
  type LabelOrder,
  type OrderStatus,
} from "@/lib/admin-api";
import { subscribeInventoryNotification } from "@/lib/admin-socket";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  PROCESSING: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30",
  COMPLETED: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30",
};

function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomLabelOrdersPage() {
  const [orders, setOrders] = useState<LabelOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchLabelOrders();
      setOrders(data ?? []);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeInventoryNotification(() => {
      void load();
    });
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        o.orderId,
        o.businessName,
        o.ownerName,
        o.phone,
        o.whatsapp,
        (o.bottle as { bottleName?: string } | null)?.bottleName ?? "",
        (o.cap as { color?: string } | null)?.color ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, search, statusFilter]);

  const totalCount = orders.length;

  const stats = useMemo(
    () => [
      {
        label: "Total Orders",
        count: orders.length,
        hint: "All time",
        icon: Layers,
        accent:
          "bg-[#E6F7F8] dark:bg-[#163A3B] text-[#2FB9BF] ring-[#2FB9BF]/30",
      },
      {
        label: "Pending",
        count: orders.filter((o) => o.status === "PENDING").length,
        hint: "Awaiting review",
        icon: Clock,
        accent:
          "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-200 dark:ring-amber-500/30",
      },
      {
        label: "In Progress",
        count: orders.filter((o) => o.status === "PROCESSING").length,
        hint: "Being fulfilled",
        icon: Loader2,
        spinIcon: true,
        accent:
          "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-200 dark:ring-sky-500/30",
      },
      {
        label: "Completed",
        count: orders.filter((o) => o.status === "COMPLETED").length,
        hint: "Delivered",
        icon: CircleCheck,
        accent:
          "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-500/30",
      },
      {
        label: "Cancelled",
        count: orders.filter((o) => o.status === "CANCELLED").length,
        hint: "Voided",
        icon: CircleX,
        accent:
          "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-500/30",
      },
    ],
    [orders]
  );

  return (
    <AdminPage
      title="Custom Label Orders"
      description="White-label and custom-branded water bottle orders."
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-5 transition-all duration-200 hover:border-[#2FB9BF]/50 hover:shadow-[0_8px_24px_rgba(47,185,191,0.12)] dark:hover:shadow-none"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${stat.accent}`}
            >
              <stat.icon
                className={`h-5 w-5 ${stat.spinIcon ? "animate-spin" : ""}`}
              />
            </span>
            <p className="mt-4 text-2xl font-bold tracking-tight text-[#0F172A] dark:text-white">
              {loading && orders.length === 0 ? "—" : stat.count}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8]">
              {stat.label}
            </p>
            <p className="text-xs text-[#94A3B8] dark:text-[#64748B]">
              {stat.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#E2E8F0] dark:border-[#1E293B] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          {totalCount} {totalCount === 1 ? "order" : "orders"} total
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders…"
              className={`${inputClass} min-w-[220px] pl-9`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ALL" | OrderStatus)
            }
            className={`${inputClass} w-auto`}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {loadError ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">
            {loadError}
          </p>
        </div>
      ) : loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            Loading orders…
          </p>
        </div>
      ) : filtered.length === 0 ? (
        orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No custom label orders"
            hint="Once customers request custom-branded bottles, their orders will be listed here."
          />
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Search className="h-8 w-8 text-[#CBD5E1]" />
            <p className="mt-3 text-sm font-semibold text-[#0F172A] dark:text-white">
              No orders match your filters
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="mt-3 text-sm font-semibold text-[#2FB9BF] hover:underline"
            >
              Clear filters
            </button>
          </div>
        )
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Business</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Bottle</th>
                <th className="px-6 py-3">Sizes / Qty</th>
                <th className="px-6 py-3">Cap</th>
                <th className="px-6 py-3">PET</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
              {filtered.map((order) => {
                const bottle = order.bottle as
                  | { bottleName?: string; customId?: string }
                  | null;
                const cap = order.cap as { color?: string; customId?: string } | null;
                const pet = order.petPackaging as
                  | { size?: string; customId?: string }
                  | null;
                return (
                  <tr
                    key={order._id}
                    className="align-middle transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                  >
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-[#E6F7F8] dark:bg-[#163A3B] px-2.5 py-1 font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4] ring-1 ring-[#2FB9BF]/30">
                        {order.orderId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                        {order.businessName}
                      </p>
                      {order.logoUrl && (
                        <a
                          href={order.logoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#2FB9BF] hover:underline"
                        >
                          View logo
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569] dark:text-[#94A3B8]">
                      {order.ownerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569] dark:text-[#94A3B8]">
                      <p>{order.phone}</p>
                      {!order.isWhatsappSameAsPhone &&
                        order.whatsapp !== order.phone && (
                          <p className="text-xs text-[#94A3B8]">
                            WhatsApp: {order.whatsapp}
                          </p>
                        )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569] dark:text-[#94A3B8]">
                      {bottle?.bottleName ?? "—"}
                      {bottle?.customId && (
                        <span className="ml-1 text-xs text-[#94A3B8]">
                          ({bottle.customId})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(order.sizeSelections ?? []).map((s) => (
                          <span
                            key={s.size}
                            className="rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-2 py-0.5 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]"
                          >
                            {s.size} × {s.quantity}
                          </span>
                        ))}
                        {(order.sizeSelections ?? []).length === 0 && (
                          <span className="text-sm text-[#94A3B8]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569] dark:text-[#94A3B8]">
                      {cap ? `${cap.color} (${cap.customId})` : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#475569] dark:text-[#94A3B8]">
                      {pet ? `${pet.size} (${pet.customId})` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                          STATUS_STYLES[order.status] ?? ""
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#94A3B8]">
                      {formatTime(order.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </AdminPage>
  );
}