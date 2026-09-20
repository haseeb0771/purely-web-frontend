"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FilterX,
  Loader2,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import DatePicker from "@/components/admin/DatePicker";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import NumberInput from "@/components/admin/NumberInput";
import SelectDropdown, { type SelectOption } from "@/components/admin/SelectDropdown";
import { useToast } from "@/components/admin/toast";
import {
  ApiError,
  deleteOrder,
  fetchOrdersPaginated,
  updateOrder,
  type OrderPagination,
  type OrderResponse,
  type OrderStatus,
} from "@/lib/admin-api";
import { subscribeAdminActivity } from "@/lib/admin-socket";

const pageSize = 10;

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  PROCESSING:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30",
  COMPLETED:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30",
  DELIVERED:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  CANCELLED:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30",
};

const STATUS_ORDER: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PAID:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  PARTIAL:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30",
  UNPAID:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/30",
};

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function deliveryLabel(iso?: string | null): {
  text: string;
  tone: string;
} | null {
  if (!iso) return null;
  const day = new Date(iso);
  const now = new Date();
  const dayStart = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate()
  ).getTime();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const diffDays = Math.round((dayStart - todayStart) / 86400000);
  if (diffDays < 0)
    return { text: `Overdue by ${-diffDays}d`, tone: "text-red-500" };
  if (diffDays === 0)
    return {
      text: "Due today",
      tone: "text-amber-600 dark:text-amber-400",
    };
  return {
    text: `${diffDays}d left`,
    tone:
      diffDays <= 2
        ? "text-amber-600 dark:text-amber-400"
        : "text-emerald-600 dark:text-emerald-400",
  };
}

function money(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `Rs. ${value.toLocaleString("en-US")}`;
}

function orderTotalBottles(order: OrderResponse): number {
  return order.bottleSelection.sizeQuantities.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
}

function orderTotalPets(order: OrderResponse): number {
  return order.petPackagingSelection.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
}

interface FiltersState {
  search: string;
  status: string;
  deliveryFrom: string;
  deliveryTo: string;
}

const emptyFilters: FiltersState = {
  search: "",
  status: "",
  deliveryFrom: "",
  deliveryTo: "",
};

const STATUS_OPTIONS: SelectOption[] = [
  { label: "All statuses", value: "ALL" },
  ...STATUS_ORDER.map((s) => ({ label: s, value: s })),
];

function StatusSelect({
  value,
  onChange,
}: {
  value: OrderStatus;
  onChange: (s: OrderStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:bg-[#0F172A]"
      >
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS_STYLES[value]}`}
        >
          {value}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 text-[#94A3B8] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg dark:border-[#1E293B] dark:bg-[#0F172A]">
          {STATUS_ORDER.map((s) => {
            const isActive = s === value;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-[#F0FDFB] dark:bg-[#163A3B]"
                    : "hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                }`}
              >
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${STATUS_STYLES[s]}`}
                >
                  {s}
                </span>
                {isActive && <Check className="ml-auto h-3.5 w-3.5 text-[#2FB9BF]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ManageOrdersPage() {
  const toast = useToast();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [pagination, setPagination] = useState<OrderPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchDraft, setSearchDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("ALL");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(
    null
  );
  const [detailsStatus, setDetailsStatus] = useState<OrderStatus>("PENDING");
  const [savingStatus, setSavingStatus] = useState(false);

  const [editingOrder, setEditingOrder] = useState<OrderResponse | null>(null);
  const [editForm, setEditForm] = useState({
    businessName: "",
    ownerName: "",
    ownerPhone: "",
    ownerWhatsapp: "",
    isWhatsappSame: false,
    deliveryDate: "",
    status: "PENDING" as OrderStatus,
  });
  const [editSaving, setEditSaving] = useState(false);

  const [deletingOrder, setDeletingOrder] = useState<OrderResponse | null>(
    null
  );
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [paymentOrder, setPaymentOrder] = useState<OrderResponse | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filtersRef = useRef<FiltersState>(emptyFilters);
  const pageRef = useRef(1);

  const load = useCallback(async (targetPage: number) => {
    const filters = filtersRef.current;
    pageRef.current = targetPage;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await fetchOrdersPaginated({
        page: targetPage,
        limit: pageSize,
        search: filters.search,
        status: filters.status,
        deliveryFrom: filters.deliveryFrom,
        deliveryTo: filters.deliveryTo,
      });
      setOrders(Array.isArray(result.data) ? result.data : []);
      setPagination(result.pagination ?? null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    return subscribeAdminActivity(() => {
      void load(pageRef.current);
    });
  }, [load]);

  function handleApply() {
    filtersRef.current = {
      search: searchDraft.trim(),
      status: statusDraft === "ALL" ? "" : statusDraft,
      deliveryFrom,
      deliveryTo,
    };
    void load(1);
  }

  function handleReset() {
    filtersRef.current = { ...emptyFilters };
    setSearchDraft("");
    setStatusDraft("ALL");
    setDeliveryFrom("");
    setDeliveryTo("");
    void load(1);
  }

  const hasActiveFilters =
    filtersRef.current.search !== "" ||
    filtersRef.current.status !== "" ||
    filtersRef.current.deliveryFrom !== "" ||
    filtersRef.current.deliveryTo !== "";

  function openDetails(order: OrderResponse) {
    setSelectedOrder(order);
    setDetailsStatus(order.status);
  }

  async function saveStatus() {
    if (!selectedOrder) return;
    if (detailsStatus === selectedOrder.status) return;
    setSavingStatus(true);
    try {
      const updated = await updateOrder(selectedOrder._id, {
        status: detailsStatus,
      });
      setSelectedOrder(updated);
      toast.success("Order status updated.");
      if (
        detailsStatus === "DELIVERED" &&
        (updated.sellingPrice ?? 0) > (updated.totalPaid ?? 0)
      ) {
        setPaymentOrder(updated);
      }
      void load(pageRef.current);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update status."
      );
    } finally {
      setSavingStatus(false);
    }
  }

  async function recordPayment(amount: number, method: string, note: string) {
    if (!paymentOrder) return;
    setPaymentSaving(true);
    try {
      const updated = await updateOrder(paymentOrder._id, {
        payment: {
          amount,
          method: method.trim() || undefined,
          note: note.trim() || undefined,
        },
      });
      setPaymentOrder(null);
      if (selectedOrder?._id === updated._id) setSelectedOrder(updated);
      toast.success(
        updated.paymentStatus === "PAID"
          ? "Payment received — order fully paid."
          : "Payment recorded."
      );
      void load(pageRef.current);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to record payment."
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  function openEdit(order: OrderResponse) {
    setEditingOrder(order);
    setEditForm({
      businessName: order.clientDetails.businessName,
      ownerName: order.clientDetails.ownerName,
      ownerPhone: order.clientDetails.ownerPhone,
      ownerWhatsapp: order.clientDetails.ownerWhatsapp,
      isWhatsappSame: order.clientDetails.isWhatsappSameAsPhone,
      deliveryDate: order.deliveryDate
        ? order.deliveryDate.slice(0, 10)
        : "",
      status: order.status,
    });
  }

  async function saveEdit() {
    if (!editingOrder) return;
    setEditSaving(true);
    try {
      const form = editForm;
      await updateOrder(editingOrder._id, {
        status: form.status,
        deliveryDate: form.deliveryDate
          ? new Date(`${form.deliveryDate}T12:00:00`).toISOString()
          : null,
        clientDetails: {
          businessName: form.businessName.trim(),
          ownerName: form.ownerName.trim(),
          ownerPhone: form.ownerPhone.trim(),
          ownerWhatsapp: form.isWhatsappSame
            ? form.ownerPhone.trim()
            : form.ownerWhatsapp.trim(),
          isWhatsappSameAsPhone: form.isWhatsappSame,
        },
      });
      setEditingOrder(null);
      toast.success("Order updated successfully.");
      void load(pageRef.current);
      if (selectedOrder?._id === editingOrder._id) {
        setSelectedOrder(null);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update order."
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingOrder) return;
    setDeleteSaving(true);
    try {
      await deleteOrder(deletingOrder._id);
      setDeletingOrder(null);
      if (selectedOrder?._id === deletingOrder._id) setSelectedOrder(null);
      toast.success(
        `Order ${deletingOrder.orderId} deleted and its stock restored.`
      );
      void load(pageRef.current);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to delete order."
      );
      setDeleteSaving(false);
    }
  }

  return (
    <AdminPage
      title="All Orders"
      description="Track orders, delivery timelines and statuses."
    >
      <div className="space-y-5 p-4 sm:p-6">
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-4 sm:px-6 dark:border-[#1E293B]">
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
              {pagination?.total ?? 0}{" "}
              {(pagination?.total ?? 0) === 1 ? "order" : "orders"} total
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-b border-[#E2E8F0] px-4 py-4 sm:px-6 dark:border-[#1E293B]">
            <label className="flex min-w-[220px] flex-col gap-1">
              <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                Search
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search by client, business or phone…"
                  className={`${inputClass} w-full pl-9`}
                />
                {searchDraft && (
                  <button
                    type="button"
                    onClick={() => setSearchDraft("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </label>

            <label className="flex min-w-[200px] flex-col gap-1">
              <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                Status
              </span>
              <SelectDropdown
                value={statusDraft}
                options={STATUS_OPTIONS}
                onSelect={setStatusDraft}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                Delivery date
              </span>
              <DateRangeFilter
                from={deliveryFrom}
                to={deliveryTo}
                onChange={(r) => {
                  setDeliveryFrom(r.from);
                  setDeliveryTo(r.to);
                }}
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApply}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4] disabled:opacity-50"
              >
                <FilterX className="h-4 w-4" />
                Apply
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading || !hasActiveFilters}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 disabled:opacity-40 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          {loadError ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">
                {loadError}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Business</th>
                    <th className="px-6 py-3">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3">Delivery Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                  {loading && safeOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2FB9BF]" />
                        <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
                          Loading orders…
                        </p>
                      </td>
                    </tr>
                  ) : safeOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                        <ClipboardList className="mx-auto h-12 w-12 text-[#CBD5E1]" />
                        <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">
                          No orders found
                        </h2>
                        <p className="mx-auto mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
                          {hasActiveFilters
                            ? "No orders match the current filters."
                            : "Create your first order to start tracking deliveries here."}
                        </p>
                      </td>
                    </tr>
                  ) : safeOrders.map((order) => {
                    const bottle = order.bottleSelection.bottleId;
                    const due = deliveryLabel(order.deliveryDate);
                    const totalBottles = orderTotalBottles(order);
                    const totalPets = orderTotalPets(order);
                    return (
                      <tr
                        key={order._id}
                        onClick={() => openDetails(order)}
                        className="cursor-pointer align-middle transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                      >
                        <td className="px-6 py-4">
                          <span className="rounded-lg bg-[#E6F7F8] dark:bg-[#163A3B] px-2.5 py-1 font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4] ring-1 ring-[#2FB9BF]/30">
                            {order.orderId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                            {order.clientDetails.businessName}
                          </p>
                          <p className="text-xs text-[#94A3B8]">
                            {order.clientDetails.ownerName} · {bottle?.bottleName ?? "—"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                            {totalBottles.toLocaleString("en-US")}{" "}
                            <span className="font-medium text-[#94A3B8]">
                              bottles
                            </span>
                          </p>
                          {totalPets > 0 && (
                            <p className="text-xs font-semibold text-[#2FB9BF]">
                              + {totalPets.toLocaleString("en-US")} PET
                            </p>
                          )}
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
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                            {formatDateOnly(order.deliveryDate)}
                          </p>
                          {due && (
                            <p className={`text-xs font-semibold ${due.tone}`}>
                              {due.text}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(order);
                              }}
                              title="View more details"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF] dark:border-[#334155] dark:text-[#94A3B8]"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(order);
                              }}
                              title="Edit order"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] transition-colors hover:border-sky-500/50 hover:text-sky-600 dark:border-[#334155] dark:text-[#94A3B8]"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingOrder(order);
                              }}
                              title="Delete order"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] transition-colors hover:border-red-400/60 hover:text-red-600 dark:border-[#334155] dark:text-[#94A3B8]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && safeOrders.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E2E8F0] dark:border-[#1E293B] p-4 sm:flex-row sm:px-6">
              <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                Showing{" "}
                {(pagination.page - 1) * pageSize + 1}–
                {Math.min(pagination.page * pageSize, pagination.total)} of{" "}
                {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void load(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#E2E8F0] px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#334155] dark:text-[#94A3B8]"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="px-1 text-sm font-semibold text-[#475569] dark:text-[#94A3B8]">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => void load(pagination.page + 1)}
                  disabled={!pagination.hasMore || loading}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#E2E8F0] px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#334155] dark:text-[#94A3B8]"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          detailsStatus={detailsStatus}
          setDetailsStatus={setDetailsStatus}
          savingStatus={savingStatus}
          onSaveStatus={saveStatus}
          onRecordPayment={() => setPaymentOrder(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          saving={paymentSaving}
          onRecord={recordPayment}
          onClose={() => {
            if (!paymentSaving) setPaymentOrder(null);
          }}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          form={editForm}
          setForm={setEditForm}
          saving={editSaving}
          onSave={saveEdit}
          onClose={() => setEditingOrder(null)}
        />
      )}

      {deletingOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
            onClick={() => !deleteSaving && setDeletingOrder(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.2)] dark:border-[#1E293B] dark:bg-[#0F172A]">
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Delete order
            </h3>
            <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
              Are you sure you want to delete{" "}
              <span className="font-bold text-[#0F172A] dark:text-white">
                {deletingOrder.orderId}
              </span>{" "}
              for <span className="font-bold text-[#0F172A] dark:text-white">
                {deletingOrder.clientDetails.businessName}
              </span>
              ? The consumed stock will be restored to inventory.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                disabled={deleteSaving}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:text-[#94A3B8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteSaving}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleteSaving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function OrderDetailsModal({
  order,
  detailsStatus,
  setDetailsStatus,
  savingStatus,
  onSaveStatus,
  onRecordPayment,
  onClose,
}: {
  order: OrderResponse;
  detailsStatus: OrderStatus;
  setDetailsStatus: (status: OrderStatus) => void;
  savingStatus: boolean;
  onSaveStatus: () => void;
  onRecordPayment: () => void;
  onClose: () => void;
}) {
  const bottle = order.bottleSelection.bottleId;
  const cap = order.capSelection.capId;
  const label = order.labelSelection.labelId;
  const capUnitCost = cap
    ? cap.unitCostPrice > 0
      ? cap.unitCostPrice
      : cap.totalQuantity > 0
        ? cap.totalCostPrice / cap.totalQuantity
        : undefined
    : undefined;
  const remaining = Math.max(
    0,
    (order.sellingPrice ?? 0) - (order.totalPaid ?? 0)
  );

  const estimatedTotal = [
    ...order.bottleSelection.sizeQuantities.map((item) => {
      const detail = bottle?.sizeDetails.find((d) => d.size === item.size);
      return (detail?.unitCostPrice ?? 0) * item.quantity;
    }),
    (capUnitCost ?? 0) * order.capSelection.quantity,
    ...(label
      ? order.bottleSelection.sizeQuantities.map((item) => {
          const detail = label.sizeDetails.find((d) => d.size === item.size);
          return (detail?.unitCostPrice ?? 0) * item.quantity;
        })
      : []),
    ...order.petPackagingSelection.map((item) => {
      const pet = item.petPackagingId;
      const detail = pet.sizeDetails?.find((d) => d.size === item.size);
      const unitCost = detail
        ? detail.unitCostPrice > 0
          ? detail.unitCostPrice
          : detail.quantity > 0
            ? detail.totalCostPrice / detail.quantity
            : 0
        : pet.unitCostPrice > 0
          ? pet.unitCostPrice
          : pet.quantity > 0
            ? pet.totalCostPrice / pet.quantity
            : 0;
      return Number.isFinite(unitCost) ? unitCost * item.quantity : 0;
    }),
  ].reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.2)] dark:border-[#1E293B] dark:bg-[#0F172A]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] dark:border-[#1E293B] p-5">
          <div className="flex items-center gap-3">
            <p className="font-mono text-sm font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
              {order.orderId}
            </p>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                STATUS_STYLES[order.status] ?? ""
              }`}
            >
              {order.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-colors hover:text-[#0F172A] dark:border-[#334155] dark:text-[#94A3B8] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                Update Status
              </p>
              <div className="flex items-center gap-2">
                <StatusSelect
                  value={detailsStatus}
                  onChange={setDetailsStatus}
                />
                <button
                  type="button"
                  onClick={onSaveStatus}
                  disabled={savingStatus || detailsStatus === order.status}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4] disabled:opacity-50"
                >
                  {savingStatus && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Client
              </h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Business</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white text-right">
                    {order.clientDetails.businessName}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Owner</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {order.clientDetails.ownerName}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Phone</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {order.clientDetails.ownerPhone}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">WhatsApp</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {order.clientDetails.ownerWhatsapp}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">
                    Same as phone
                  </dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {order.clientDetails.isWhatsappSameAsPhone ? "Yes" : "No"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Bottle
              </h4>
              {bottle ? (
                <>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B] dark:text-[#94A3B8]">Name</dt>
                      <dd className="font-semibold text-[#0F172A] dark:text-white">
                        {bottle.bottleName} ({bottle.customId})
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B] dark:text-[#94A3B8]">Type</dt>
                      <dd className="font-semibold text-[#0F172A] dark:text-white">
                        {bottle.type}
                      </dd>
                    </div>
                  </dl>
                  {bottle.imageUrl?.trim() && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={bottle.imageUrl}
                      alt={bottle.bottleName}
                      className="mt-3 h-20 w-20 rounded-xl object-cover ring-1 ring-[#E2E8F0] dark:ring-[#334155]"
                    />
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-[#94A3B8]">Not available.</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Bottle Sizes &amp; Quantity
            </h4>
            <div className="mt-3 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#334155]">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] dark:bg-[#1E293B] text-xs uppercase tracking-wider text-[#94A3B8]">
                  <tr>
                    <th className="px-4 py-2 text-left">Size</th>
                    <th className="px-4 py-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                  {order.bottleSelection.sizeQuantities.map((item) => (
                    <tr key={item.size}>
                      <td className="px-4 py-2 font-semibold text-[#0F172A] dark:text-white">
                        {item.size}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-[#0F172A] dark:text-white">
                        {item.quantity.toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Cap
              </h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Color</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {cap?.color ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">ID</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {cap?.customId ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Quantity</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {order.capSelection.quantity.toLocaleString("en-US")} pcs
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Label
              </h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Type</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {order.labelSelection.type === "NEW_DESIGN"
                      ? "New Design"
                      : "Existing Inventory"}
                  </dd>
                </div>
                {order.labelSelection.type === "NEW_DESIGN" ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#64748B] dark:text-[#94A3B8]">Logo</dt>
                    <dd className="text-right">
                      {order.labelSelection.logoImageUrl ? (
                        <a
                          href={order.labelSelection.logoImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#2FB9BF] hover:underline"
                        >
                          View logo
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B] dark:text-[#94A3B8]">Name</dt>
                      <dd className="font-semibold text-[#0F172A] dark:text-white">
                        {label?.name ?? "—"}
                        {label?.customId ? ` (${label.customId})` : ""}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#64748B] dark:text-[#94A3B8]">Image</dt>
                      <dd className="text-right">
                        {label?.imageUrl ? (
                          <a
                            href={label.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[#2FB9BF] hover:underline"
                          >
                            View image
                          </a>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              PET Packaging{" "}
              {order.petPackagingSelection.length > 0 && (
                <span className="text-[#2FB9BF]">
                  ({orderTotalPets(order).toLocaleString("en-US")} total)
                </span>
              )}
            </h4>
            {order.petPackagingSelection.length === 0 ? (
              <p className="mt-3 text-sm text-[#94A3B8]">No PET packaging.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {order.petPackagingSelection.map((item) => (
                  <div
                    key={`${item.petPackagingId._id}-${item.size}`}
                    className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] dark:border-[#334155] dark:bg-[#0F172A] px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                        {item.size}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {item.petPackagingId.customId}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                      {item.quantity.toLocaleString("en-US")} units
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                <CalendarDays className="h-3.5 w-3.5" /> Delivery
              </h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Date</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {formatDateOnly(order.deliveryDate)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">
                    Days remaining
                  </dt>
                  <dd
                    className={`font-semibold ${
                      deliveryLabel(order.deliveryDate)?.tone ??
                      "text-[#0F172A] dark:text-white"
                    }`}
                  >
                    {deliveryLabel(order.deliveryDate)?.text ?? "Not set"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                <Phone className="h-3.5 w-3.5" /> Meta
              </h4>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Created by</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {order.createdBy?.name ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Created</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {formatDateTime(order.createdAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#64748B] dark:text-[#94A3B8]">Updated</dt>
                  <dd className="font-semibold text-[#0F172A] dark:text-white">
                    {formatDateTime(order.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
              Cost &amp; Financials{" "}
              {order.priceBreakdown && (
                <span className="text-[#2FB9BF]">× per-size bill</span>
              )}
            </h4>
            {order.priceBreakdown ? (
              <div className="mt-3 space-y-1.5 text-sm">
                {order.priceBreakdown.bottleLines.map((line, i) => (
                  <div
                    key={`bd-bottle-${i}`}
                    className="flex justify-between gap-2 text-[#64748B] dark:text-[#94A3B8]"
                  >
                    <span className="truncate">
                      Bottle {line.size} × {line.quantity.toLocaleString("en-US")}
                      {line.costPerBottle
                        ? ` (Rs. ${line.costPerBottle.toLocaleString()}/bottle incl. ${(
                            line.waterCostPerBottle ?? 0
                          ).toLocaleString()} water)`
                        : ` (Rs. ${line.costPerUnit.toLocaleString()}/bottle)`}
                      {line.costPerPET && line.petCount
                        ? ` · PET Rs. ${line.costPerPET.toLocaleString()}`
                        : ""}
                    </span>
                    <span className="font-medium text-[#0F172A] dark:text-white">
                      {money(line.costAmount)}
                    </span>
                  </div>
                ))}
                {order.priceBreakdown.componentTotals.caps > 0 && (
                  <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                    <span>
                      Caps × {order.capSelection.quantity.toLocaleString("en-US")}
                    </span>
                    <span className="font-medium text-[#0F172A] dark:text-white">
                      {money(order.priceBreakdown.componentTotals.caps)}
                    </span>
                  </div>
                )}
                {order.priceBreakdown.componentTotals.labels > 0 && (
                  <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                    <span>Labels</span>
                    <span className="font-medium text-[#0F172A] dark:text-white">
                      {money(order.priceBreakdown.componentTotals.labels)}
                    </span>
                  </div>
                )}
                {order.priceBreakdown.petLines.map((line, i) => (
                  <div
                    key={`bd-pet-${i}`}
                    className="flex justify-between gap-2 text-[#64748B] dark:text-[#94A3B8]"
                  >
                    <span className="truncate">
                      PET {line.size} × {line.quantity.toLocaleString("en-US")} (Rs.{" "}
                      {line.costPerUnit.toLocaleString()}/pack)
                    </span>
                    <span className="font-medium text-[#0F172A] dark:text-white">
                      {money(line.costAmount)}
                    </span>
                  </div>
                ))}
                {order.priceBreakdown.water.amount > 0 && (
                  <div className="flex justify-between text-[#0E7A80] dark:text-[#5EEAD4]">
                    <span>
                      Water @ Rs. {order.priceBreakdown.water.rate}/L ×{" "}
                      {order.priceBreakdown.water.liters.toLocaleString()} L
                    </span>
                    <span className="font-medium">
                      {money(order.priceBreakdown.water.amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#E2E8F0] pt-2 dark:border-[#1E293B]">
                  <span className="font-semibold text-[#0F172A] dark:text-white">
                    Total Cost (incl. water)
                  </span>
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {money(order.totalCost ?? order.priceBreakdown.totals.cost)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-1.5 text-sm">
                {order.bottleSelection.sizeQuantities.map((item) => {
                  const detail = bottle?.sizeDetails.find(
                    (d) => d.size === item.size
                  );
                  const lineCost = (detail?.unitCostPrice ?? 0) * item.quantity;
                  return (
                    <div
                      key={item.size}
                      className="flex justify-between text-[#64748B] dark:text-[#94A3B8]"
                    >
                      <span>
                        Bottle {item.size} × {item.quantity.toLocaleString("en-US")}
                      </span>
                      <span className="font-medium text-[#0F172A] dark:text-white">
                        {money(lineCost)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8]">
                  <span>
                    Cap × {order.capSelection.quantity.toLocaleString("en-US")}
                  </span>
                  <span className="font-medium text-[#0F172A] dark:text-white">
                    {money((capUnitCost ?? 0) * order.capSelection.quantity)}
                  </span>
                </div>
                {label &&
                  order.bottleSelection.sizeQuantities.map((item) => {
                    const detail = label.sizeDetails.find(
                      (d) => d.size === item.size
                    );
                    if (!detail) return null;
                    return (
                      <div
                        key={`label-${item.size}`}
                        className="flex justify-between text-[#64748B] dark:text-[#94A3B8]"
                      >
                        <span>
                          Label {item.size} ×{" "}
                          {item.quantity.toLocaleString("en-US")}
                        </span>
                        <span className="font-medium text-[#0F172A] dark:text-white">
                          {money(
                            (detail.unitCostPrice > 0
                              ? detail.unitCostPrice
                              : detail.quantity > 0
                                ? detail.totalCostPrice / detail.quantity
                                : 0) * item.quantity
                          )}
                        </span>
                      </div>
                    );
                  })}
                {order.petPackagingSelection.map((item) => {
                  const pet = item.petPackagingId;
                  const detail = pet.sizeDetails?.find(
                    (d) => d.size === item.size
                  );
                  const unitCost = detail
                    ? detail.unitCostPrice > 0
                      ? detail.unitCostPrice
                      : detail.quantity > 0
                        ? detail.totalCostPrice / detail.quantity
                        : 0
                    : pet.unitCostPrice > 0
                      ? pet.unitCostPrice
                      : pet.quantity > 0
                        ? pet.totalCostPrice / pet.quantity
                        : 0;
                  return (
                    <div
                      key={`pet-${item.petPackagingId._id}-${item.size}`}
                      className="flex justify-between text-[#64748B] dark:text-[#94A3B8]"
                    >
                      <span>
                        PET {item.size} × {item.quantity.toLocaleString("en-US")}
                      </span>
                      <span className="font-medium text-[#0F172A] dark:text-white">
                        {money((unitCost ?? 0) * item.quantity)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex justify-between border-t border-[#E2E8F0] pt-2 dark:border-[#1E293B]">
                  <span className="font-semibold text-[#0F172A] dark:text-white">
                    Total Cost
                  </span>
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {money(order.totalCost ?? estimatedTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Selling Price
              </h4>
              <p className="mt-2 text-2xl font-extrabold text-[#0F172A] dark:text-white">
                {money(order.sellingPrice ?? 0)}
              </p>
              {order.priceBreakdown && (
                <div className="mt-2 space-y-1 border-t border-[#E2E8F0] pt-2 dark:border-[#1E293B]">
                  {order.priceBreakdown.bottleLines
                    .filter((line) => (line.sellAmount ?? 0) > 0)
                    .map((line, i) => (
                      <div
                        key={`sell-bottle-${i}`}
                        className="flex justify-between text-xs text-[#64748B] dark:text-[#94A3B8]"
                      >
                        <span>
                          {line.size} × {line.quantity.toLocaleString("en-US")}
                          {line.sellPerPET
                            ? ` (Rs. ${line.sellPerPET.toLocaleString()}/PET)`
                            : ` (Rs. ${(line.sellPerUnit ?? 0).toLocaleString()}/bottle)`}
                        </span>
                        <span className="font-semibold text-[#0F172A] dark:text-white">
                          {money(line.sellAmount ?? 0)}
                        </span>
                      </div>
                    ))}
                  {order.priceBreakdown.petLines
                    .filter((line) => (line.sellAmount ?? 0) > 0)
                    .map((line, i) => (
                      <div
                        key={`sell-pet-${i}`}
                        className="flex justify-between text-xs text-[#64748B] dark:text-[#94A3B8]"
                      >
                        <span>
                          PET {line.size} × {line.quantity.toLocaleString("en-US")} (Rs.{" "}
                          {line.sellPerUnit?.toLocaleString()}/pack)
                        </span>
                        <span className="font-semibold text-[#0F172A] dark:text-white">
                          {money(line.sellAmount ?? 0)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                {((order.profit ?? 0) >= 0) ? "Profit" : "Loss"}
              </h4>
              <p className={`mt-2 text-2xl font-extrabold ${
                (order.profit ?? 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}>
                {(order.profit ?? 0) >= 0 ? "+" : ""}{money(order.profit ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Payment
              </h4>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                  PAYMENT_STATUS_STYLES[order.paymentStatus ?? "UNPAID"] ?? ""
                }`}
              >
                {order.paymentStatus === "PAID"
                  ? "Fully paid"
                  : order.paymentStatus === "PARTIAL"
                  ? "Partially paid"
                  : "Payment pending"}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 dark:border-[#334155] dark:bg-[#0F172A]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Bill total
                </p>
                <p className="mt-0.5 text-sm font-bold text-[#0F172A] dark:text-white">
                  {money(order.sellingPrice ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 dark:border-[#334155] dark:bg-[#0F172A]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Amount paid
                </p>
                <p className="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {money(order.totalPaid ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 dark:border-[#334155] dark:bg-[#0F172A]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Remaining
                </p>
                <p
                  className={`mt-0.5 text-sm font-bold ${
                    remaining > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {money(remaining)}
                </p>
              </div>
            </div>
            {remaining > 0 && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-[#94A3B8]">
                  {order.status === "DELIVERED"
                    ? "Reminders are sent every 2 days until settled."
                    : "You can record advance or partial payments."}
                </p>
                <button
                  type="button"
                  onClick={onRecordPayment}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4]"
                >
                  Record payment
                </button>
              </div>
            )}
            {(order.payments?.length ?? 0) > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-[#E2E8F0] pt-3 dark:border-[#1E293B]">
                {order.payments!.slice(-5).reverse().map((entry, i) => (
                  <div
                    key={`${entry.paidAt}-${i}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {entry.source === "ADVANCE" && (
                        <span className="inline-flex shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          Advance
                        </span>
                      )}
                      <span className="truncate text-[#64748B] dark:text-[#94A3B8]">
                        {formatDateTime(entry.paidAt)}
                        {entry.method ? ` · ${entry.method}` : ""}
                        {entry.recordedByName ? ` · ${entry.recordedByName}` : ""}
                      </span>
                    </span>
                    <span className="font-semibold text-[#0F172A] dark:text-white">
                      {money(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-[#2FB9BF]/30 bg-[#E6F7F8] p-4 dark:border-[#2FB9BF]/20 dark:bg-[#163A3B]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#0E7A80] dark:text-[#5EEAD4]">
                Total Units
              </p>
              <p className="text-lg font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                {orderTotalBottles(order).toLocaleString("en-US")} bottles
                {orderTotalPets(order) > 0 && (
                  <>
                    {" "}
                    + {orderTotalPets(order).toLocaleString("en-US")} PET
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({
  order,
  saving,
  onRecord,
  onClose,
}: {
  order: OrderResponse;
  saving: boolean;
  onRecord: (amount: number, method: string, note: string) => void;
  onClose: () => void;
}) {
  const totalBill = order.sellingPrice ?? 0;
  const alreadyPaid = order.totalPaid ?? 0;
  const remaining = Math.max(0, totalBill - alreadyPaid);
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");

  const parsed = Math.round((Number(amount) || 0) * 100) / 100;
  const invalid =
    !Number.isFinite(parsed) || parsed <= 0 || parsed > remaining;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.2)] dark:border-[#1E293B] dark:bg-[#0F172A]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] p-5 dark:border-[#1E293B]">
          <div>
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
              Record payment
            </h3>
            <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
              {order.orderId} · {order.clientDetails.businessName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close payment"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-colors hover:text-[#0F172A] disabled:opacity-50 dark:border-[#334155] dark:text-[#94A3B8] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-2 dark:border-[#334155] dark:bg-[#0F172A]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Bill
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#0F172A] dark:text-white">
                {money(totalBill)}
              </p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-2 dark:border-[#334155] dark:bg-[#0F172A]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Paid
              </p>
              <p className="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {money(alreadyPaid)}
              </p>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-2 dark:border-[#334155] dark:bg-[#0F172A]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Remaining
              </p>
              <p className="mt-0.5 text-sm font-bold text-rose-600 dark:text-rose-400">
                {money(remaining)}
              </p>
            </div>
          </div>

          <label className="mt-4 flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Amount received
            </span>
            <div className="flex items-center gap-2">
              <NumberInput
                value={Number(amount) || 0}
                min={0}
                allowDecimal
                onValueChange={(n) => setAmount(n === 0 ? "" : String(n))}
                className={`${inputClass} flex-1`}
                placeholder="0"
              />
              <button
                type="button"
                onClick={() => setAmount(String(remaining))}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[#2FB9BF]/40 px-3 text-xs font-semibold text-[#0E7A80] transition-colors hover:bg-[#E6F7F8] dark:text-[#5EEAD4] dark:hover:bg-[#163A3B]"
              >
                Full amount
              </button>
            </div>
          </label>

          <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Method (optional)
            </span>
            <SelectDropdown
              value={method}
              placeholder="Not specified"
              options={[
                { label: "Not specified", value: "" },
                { label: "Cash", value: "Cash" },
                { label: "Bank transfer", value: "Bank transfer" },
                { label: "Online transfer", value: "Online transfer" },
                { label: "Cheque", value: "Cheque" },
                { label: "Other", value: "Other" },
              ]}
              onSelect={setMethod}
            />
          </label>

          <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
              Note (optional)
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
              placeholder={order.status === "DELIVERED" ? "e.g. Final payment" : "e.g. Advance payment"}
            />
          </label>

          <p className="mt-3 text-xs text-[#94A3B8]">
            {order.status === "DELIVERED"
              ? "This order is delivered. If a balance remains, reminders are sent every 2 days until it is settled."
              : "This order is not delivered yet. The amount will be recorded as an advance payment."}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] p-4 dark:border-[#1E293B]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 disabled:opacity-50 dark:border-[#334155] dark:text-[#94A3B8]"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={() => onRecord(parsed, method, note)}
            disabled={saving || invalid}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Record payment
          </button>
        </div>
      </div>
    </div>
  );
}

function EditOrderModal({
  form,
  setForm,
  saving,
  onSave,
  onClose,
}: {
  form: {
    businessName: string;
    ownerName: string;
    ownerPhone: string;
    ownerWhatsapp: string;
    isWhatsappSame: boolean;
    deliveryDate: string;
    status: OrderStatus;
  };
  setForm: (
    updater: (prev: typeof form) => typeof form
  ) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.2)] dark:border-[#1E293B] dark:bg-[#0F172A]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] p-5">
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
            Edit Order
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close edit"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] text-[#64748B] transition-colors hover:text-[#0F172A] dark:border-[#334155] dark:text-[#94A3B8] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Business Name *
              </label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, businessName: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Owner Name *
              </label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ownerName: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Phone Number *
              </label>
              <input
                type="tel"
                value={form.ownerPhone}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    ownerPhone: e.target.value,
                    ...(p.isWhatsappSame
                      ? { ownerWhatsapp: e.target.value }
                      : {}),
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                WhatsApp Number *
              </label>
              <input
                type="tel"
                value={form.isWhatsappSame ? form.ownerPhone : form.ownerWhatsapp}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ownerWhatsapp: e.target.value }))
                }
                disabled={form.isWhatsappSame}
                className={`${inputClass} ${
                  form.isWhatsappSame ? "opacity-60" : ""
                }`}
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                <input
                  type="checkbox"
                  checked={form.isWhatsappSame}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      isWhatsappSame: e.target.checked,
                      ...(e.target.checked
                        ? { ownerWhatsapp: p.ownerPhone }
                        : {}),
                    }))
                  }
                  className="h-4 w-4 rounded border-[#CBD5E1] text-[#2FB9BF] focus:ring-[#2FB9BF]"
                />
                Same as Phone Number
              </label>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Delivery / Dispatch Date
              </label>
              <DatePicker
                value={form.deliveryDate}
                onChange={(value) =>
                  setForm((p) => ({ ...p, deliveryDate: value }))
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                Status *
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as OrderStatus,
                  }))
                }
                className={inputClass}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E2E8F0] dark:border-[#1E293B] p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E2E8F0] px-4 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:text-[#94A3B8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4] disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}