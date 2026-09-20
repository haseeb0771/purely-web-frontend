"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  ImagePlus,
  Loader2,
  PackageSearch,
  PackageCheck,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import SelectDropdown, {
  type SelectOption,
} from "@/components/admin/SelectDropdown";
import NumberInput from "@/components/admin/NumberInput";
import DatePicker from "@/components/admin/DatePicker";
import ImageHoverPreview from "@/components/admin/ImageHoverPreview";
import { useToast } from "@/components/admin/toast";
import {
  ApiError,
  createInventoryOrder,
  deleteInventoryOrder,
  fetchInventoryOrders,
  markInventoryOrderReceived,
  updateInventoryOrderPayment,
  uploadBottleImage,
  type InventoryOrder,
  type InventoryOrderItemType,
  type InventoryOrderLine,
  type InventoryOrderPaymentSelection,
} from "@/lib/admin-api";
import { subscribeInventoryNotification } from "@/lib/admin-socket";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-sm text-[#0F172A] dark:text-white placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20";

const ITEM_TYPE_OPTIONS: SelectOption[] = [
  { label: "Bottles", value: "Bottles" },
  { label: "Caps", value: "Caps" },
  { label: "PET Packaging", value: "PET Packaging" },
  { label: "Labels", value: "Labels" },
];

const PAYMENT_SELECTION_OPTIONS: SelectOption[] = [
  { label: "Full Payment", value: "FULL" },
  { label: "Half Payment", value: "HALF" },
  { label: "Custom Partial Payment", value: "CUSTOM" },
  { label: "Unpaid / Pending", value: "UNPAID" },
];

const METHOD_OPTIONS: SelectOption[] = [
  { label: "Not specified", value: "" },
  { label: "Cash", value: "Cash" },
  { label: "Bank transfer", value: "Bank transfer" },
  { label: "Online transfer", value: "Online transfer" },
  { label: "Cheque", value: "Cheque" },
  { label: "Other", value: "Other" },
];

const TYPE_FILTER_OPTIONS: SelectOption[] = [
  { label: "All item types", value: "" },
  ...ITEM_TYPE_OPTIONS,
];

const PAYMENT_FILTER_OPTIONS: SelectOption[] = [
  { label: "All payments", value: "" },
  { label: "Paid", value: "PAID" },
  { label: "Partial", value: "PARTIAL" },
  { label: "Unpaid", value: "UNPAID" },
];

const RECEIVED_FILTER_OPTIONS: SelectOption[] = [
  { label: "All deliveries", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Received", value: "RECEIVED" },
];

interface LineItem {
  uid: number;
  itemType: InventoryOrderItemType | "";
  itemName: string;
  quantity: number;
  lineTotal: number;
}

function formatMoney(value: number): string {
  return `Rs. ${(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}`;
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

interface DeliveryInfo {
  text: string;
  tone: "ok" | "today" | "overdue";
}

function deliveryInfo(
  order: InventoryOrder
): DeliveryInfo | null {
  if (order.receivedStatus === "RECEIVED") return null;
  const due = new Date(order.expectedDeliveryDate);
  if (Number.isNaN(due.getTime())) return null;
  const diffMs = due.getTime() - Date.now();
  const dayMs = 86400000;
  if (diffMs >= 0) {
    const days = Math.floor(diffMs / dayMs);
    if (days === 0) return { text: "Today", tone: "today" };
    if (days === 1) return { text: "1 day left", tone: "ok" };
    return { text: `${days} days left`, tone: "ok" };
  }
  const overdueDays = Math.max(1, Math.ceil(-diffMs / dayMs));
  return {
    text: overdueDays === 1 ? "1 day overdue" : `${overdueDays} days overdue`,
    tone: "overdue",
  };
}

function deliveryBadgeClass(tone: DeliveryInfo["tone"]): string {
  switch (tone) {
    case "today":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "overdue":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }
}

function orderItems(order: InventoryOrder): InventoryOrderLine[] {
  if (Array.isArray(order.items) && order.items.length > 0) return order.items;
  return [
    {
      itemType: order.itemType,
      itemName: order.itemName,
      quantity: order.quantity,
      totalCost: order.totalCost,
    },
  ];
}

function paymentBadgeClass(status: InventoryOrder["paymentStatus"]): string {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "PARTIAL":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    default:
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
  }
}

function itemTypeClass(itemType: InventoryOrderItemType): string {
  switch (itemType) {
    case "Bottles":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
    case "Caps":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
    case "PET Packaging":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
    default:
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
  }
}

function Thumb({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className: string;
}) {
  if (!src) return null;
  return (
    <ImageHoverPreview src={src} alt={alt} className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.opacity = "0.15";
        }}
      />
    </ImageHoverPreview>
  );
}

interface UploadFieldProps {
  label: string;
  value: string;
  required?: boolean;
  uploading: boolean;
  onChange: (url: string) => void;
}

function UploadField({
  label,
  value,
  required = false,
  uploading,
  onChange,
}: UploadFieldProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const result = await uploadBottleImage(file, "inventory-orders");
      onChange(result.url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-3">
        {value ? (
          <Thumb
            src={value}
            alt={label}
            className="h-14 w-14 overflow-hidden rounded-xl ring-1 ring-[#E2E8F0] dark:ring-[#1E293B]"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#94A3B8] dark:bg-[#1E293B]">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]">
              {busy || uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {busy || uploading ? "Uploading..." : value ? "Replace" : "Upload"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleUpload(e)}
              className="hidden"
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-left text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
            >
              Remove image
            </button>
          )}
        </div>
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[#2FB9BF] hover:underline"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function IconAction({
  title,
  onClick,
  tone = "teal",
  children,
}: {
  title: string;
  onClick: () => void;
  tone?: "teal" | "emerald" | "red";
  children: React.ReactNode;
}) {
  const toneClass = {
    teal: "hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]",
    emerald:
      "hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400",
    red: "hover:border-red-400/60 hover:text-red-600 dark:hover:text-red-400",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] transition-colors dark:border-[#334155] dark:text-[#94A3B8] ${toneClass}`}
    >
      {children}
    </button>
  );
}

export default function InventoryOrdersPage() {
  const toast = useToast();

  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [receivedFilter, setReceivedFilter] = useState("");

  // Create form
  const [showForm, setShowForm] = useState(false);
  const uidRef = useRef(1);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      uid: uidRef.current++,
      itemType: "",
      itemName: "",
      quantity: 0,
      lineTotal: 0,
    },
  ]);
  const [paymentSelection, setPaymentSelection] =
    useState<InventoryOrderPaymentSelection>("UNPAID");
  const [customPaidAmount, setCustomPaidAmount] = useState(0);
  const [method, setMethod] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [billImageUrl, setBillImageUrl] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Payment modal
  const [paymentOrder, setPaymentOrder] = useState<InventoryOrder | null>(null);
  const [payAdded, setPayAdded] = useState(0);
  const [payMethod, setPayMethod] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payReceipt, setPayReceipt] = useState("");
  const [payUploading, setPayUploading] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Confirm dialogs
  const [receiveOrder, setReceiveOrder] = useState<InventoryOrder | null>(null);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [deleteOrder, setDeleteOrder] = useState<InventoryOrder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Detail modal
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<InventoryOrder | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchInventoryOrders({
          search: debouncedSearch || undefined,
          type: typeFilter || undefined,
          paymentStatus: paymentFilter || undefined,
          receivedStatus: receivedFilter || undefined,
        });
        setOrders(data);
      } catch (err) {
        setLoadError(
          err instanceof ApiError ? err.message : "Failed to load inventory orders."
        );
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, typeFilter, paymentFilter, receivedFilter]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    return subscribeInventoryNotification(() => {
      void load(true);
    });
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOpenId(params.get("open"));
  }, []);

  useEffect(() => {
    if (openId && orders.length > 0 && !selected) {
      const match = orders.find((o) => o._id === openId);
      if (match) setSelected(match);
    }
  }, [openId, orders, selected]);

  const orderTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [lineItems]
  );

  const paidForSelection = useMemo(() => {
    if (paymentSelection === "FULL") return orderTotal;
    if (paymentSelection === "HALF") return Math.round((orderTotal / 2) * 100) / 100;
    if (paymentSelection === "CUSTOM") return customPaidAmount;
    return 0;
  }, [paymentSelection, orderTotal, customPaidAmount]);

  const remainingAfterPay = Math.max(0, orderTotal - paidForSelection);

  function updateLine(uid: number, patch: Partial<LineItem>) {
    setLineItems((current) =>
      current.map((item) => (item.uid === uid ? { ...item, ...patch } : item))
    );
  }

  function addLine() {
    setLineItems((current) => [
      ...current,
      {
        uid: uidRef.current++,
        itemType: "",
        itemName: "",
        quantity: 0,
        lineTotal: 0,
      },
    ]);
  }

  function removeLine(uid: number) {
    setLineItems((current) =>
      current.length > 1 ? current.filter((item) => item.uid !== uid) : current
    );
  }

  function resetForm() {
    setLineItems([
      {
        uid: uidRef.current++,
        itemType: "",
        itemName: "",
        quantity: 0,
        lineTotal: 0,
      },
    ]);
    setPaymentSelection("UNPAID");
    setCustomPaidAmount(0);
    setMethod("");
    setPaymentNote("");
    setBillImageUrl("");
    setReceiptImageUrl("");
    setExpectedDeliveryDate("");
    setNotes("");
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (lineItems.length === 0) {
      setFormError("Add at least one item to the order.");
      return;
    }
    for (const item of lineItems) {
      if (!item.itemType) {
        setFormError("Select the item type for every ordered item.");
        return;
      }
      if (!item.itemName.trim()) {
        setFormError("Item description is required for every item.");
        return;
      }
      if (item.quantity < 1) {
        setFormError("Quantity must be at least 1 for every item.");
        return;
      }
      if (item.lineTotal < 0) {
        setFormError("Line value cannot be negative.");
        return;
      }
    }
    if (orderTotal <= 0) {
      setFormError("Order value must be positive.");
      return;
    }
    if (!expectedDeliveryDate) {
      setFormError("Expected delivery date is required.");
      return;
    }
    if (paymentSelection === "CUSTOM" && customPaidAmount <= 0) {
      setFormError("Enter the amount paid for a custom partial payment.");
      return;
    }
    if (paymentSelection === "CUSTOM" && customPaidAmount > orderTotal) {
      setFormError("Paid amount cannot exceed the order value.");
      return;
    }
    if (paymentSelection !== "UNPAID" && !receiptImageUrl) {
      setFormError("Payment receipt is required since a payment is being made.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createInventoryOrder({
        items: lineItems.map((item) => ({
          itemType: item.itemType as InventoryOrderItemType,
          itemName: item.itemName.trim(),
          quantity: item.quantity,
          totalCost: item.lineTotal,
        })),
        paymentSelection,
        paidAmount: paymentSelection === "CUSTOM" ? customPaidAmount : undefined,
        method: method || undefined,
        note: paymentNote.trim() || undefined,
        billImageUrl: billImageUrl || undefined,
        receiptImageUrl: receiptImageUrl || undefined,
        expectedDeliveryDate,
        notes: notes.trim() || undefined,
      });
      setOrders((current) => [created, ...current]);
      toast.success(`Placed inventory order ${created.orderId}.`);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  }

  function openPaymentModal(order: InventoryOrder) {
    setPaymentOrder(order);
    const remaining = Math.max(0, order.totalCost - order.paidAmount);
    setPayAdded(remaining > 0 ? remaining : 0);
    setPayMethod("");
    setPayNote("");
    setPayReceipt("");
    setPayUploading(false);
    setPayError(null);
  }

  async function handlePayReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPayUploading(true);
    setPayError(null);
    try {
      const result = await uploadBottleImage(file, "inventory-orders");
      setPayReceipt(result.url);
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Receipt upload failed.");
    } finally {
      setPayUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmitPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paymentOrder) return;
    setPayError(null);

    const newPaid = paymentOrder.paidAmount + payAdded;
    const remaining = Math.max(
      0,
      paymentOrder.totalCost - paymentOrder.paidAmount
    );
    if (payAdded <= 0) {
      setPayError("Enter a positive payment amount.");
      return;
    }
    if (payAdded > remaining) {
      setPayError(
        `Amount exceeds the remaining balance of ${formatMoney(remaining)}.`
      );
      return;
    }
    if (newPaid > paymentOrder.totalCost) {
      setPayError("Total paid cannot exceed the order value.");
      return;
    }
    if (!payReceipt) {
      setPayError("Payment receipt is required.");
      return;
    }

    setPaySubmitting(true);
    try {
      const updated = await updateInventoryOrderPayment(paymentOrder._id, {
        paidAmount: Math.round(newPaid * 100) / 100,
        method: payMethod || undefined,
        note: payNote.trim() || undefined,
        receiptImageUrl: payReceipt,
      });
      setOrders((current) =>
        current.map((o) => (o._id === updated._id ? updated : o))
      );
      if (selected?._id === updated._id) setSelected(updated);
      toast.success("Payment recorded.");
      setPaymentOrder(null);
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Failed to update payment.");
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleMarkReceived() {
    if (!receiveOrder) return;
    setReceiveLoading(true);
    try {
      const updated = await markInventoryOrderReceived(receiveOrder._id);
      setOrders((current) =>
        current.map((o) => (o._id === updated._id ? updated : o))
      );
      if (selected?._id === updated._id) setSelected(updated);
      toast.success(`${updated.orderId} marked as received.`);
      setReceiveOrder(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to mark order as received."
      );
    } finally {
      setReceiveLoading(false);
      setReceiveOrder(null);
    }
  }

  async function handleDelete() {
    if (!deleteOrder) return;
    setDeleteLoading(true);
    try {
      await deleteInventoryOrder(deleteOrder._id);
      setOrders((current) =>
        current.filter((o) => o._id !== deleteOrder._id)
      );
      if (selected?._id === deleteOrder._id) setSelected(null);
      toast.success("Inventory order deleted.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete order.");
    } finally {
      setDeleteLoading(false);
      setDeleteOrder(null);
    }
  }

  return (
    <AdminPage
      title="Inventory Orders"
      description="Track purchase orders for stock items, payments, and deliveries."
    >
      <div className="flex flex-col gap-3 border-b border-[#E2E8F0] dark:border-[#1E293B] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className={`${inputClass} w-48 pl-9 sm:w-56`}
            />
          </div>
          <div className="w-44">
            <SelectDropdown
              value={typeFilter}
              options={TYPE_FILTER_OPTIONS}
              placeholder="All item types"
              onSelect={setTypeFilter}
            />
          </div>
          <div className="w-44">
            <SelectDropdown
              value={paymentFilter}
              options={PAYMENT_FILTER_OPTIONS}
              placeholder="All payments"
              onSelect={setPaymentFilter}
            />
          </div>
          <div className="w-44">
            <SelectDropdown
              value={receivedFilter}
              options={RECEIVED_FILTER_OPTIONS}
              placeholder="All deliveries"
              onSelect={setReceivedFilter}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setFormError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,185,191,0.3)] dark:shadow-none transition-colors hover:bg-[#28a9af]"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "Place Order"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="p-4 sm:p-6">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Item Selection <span className="text-red-500">*</span>
              </h3>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={item.uid}
                  className="rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0F172A] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                      Item {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(item.uid)}
                      disabled={lineItems.length === 1}
                      title={
                        lineItems.length === 1
                          ? "At least one item is required"
                          : "Remove item"
                      }
                      className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-900/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_150px]">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                        Item Type <span className="text-red-500">*</span>
                      </label>
                      <SelectDropdown
                        value={item.itemType}
                        options={ITEM_TYPE_OPTIONS}
                        placeholder="Select item type"
                        onSelect={(v) =>
                          updateLine(item.uid, {
                            itemType: v as InventoryOrderItemType | "",
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) =>
                          updateLine(item.uid, { itemName: e.target.value })
                        }
                        placeholder="e.g. 500ml Blue glass bottles"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <NumberInput
                        value={item.quantity}
                        onValueChange={(v) => updateLine(item.uid, { quantity: v })}
                        placeholder="e.g. 500"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                        Line Value (Rs.) <span className="text-red-500">*</span>
                      </label>
                      <NumberInput
                        value={item.lineTotal}
                        onValueChange={(v) => updateLine(item.uid, { lineTotal: v })}
                        placeholder="e.g. 15000"
                        allowDecimal
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Payment Status <span className="text-red-500">*</span>
              </label>
              <SelectDropdown
                value={paymentSelection}
                options={PAYMENT_SELECTION_OPTIONS}
                onSelect={(v) =>
                  setPaymentSelection(v as InventoryOrderPaymentSelection)
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Expected Delivery Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={expectedDeliveryDate}
                onChange={setExpectedDeliveryDate}
                placeholder="Select delivery date"
                label="Delivery date"
              />
            </div>
          </div>

          {paymentSelection !== "UNPAID" && (
            <div className="mt-5 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0F172A] p-4">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                Payment Details
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paymentSelection === "CUSTOM" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                      Amount Paid (Rs.) <span className="text-red-500">*</span>
                    </label>
                    <NumberInput
                      value={customPaidAmount}
                      onValueChange={setCustomPaidAmount}
                      placeholder="e.g. 7500"
                      allowDecimal
                      max={Math.max(0, orderTotal)}
                      className={inputClass}
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                    Payment Method
                  </label>
                  <SelectDropdown
                    value={method}
                    options={METHOD_OPTIONS}
                    placeholder="Select method (optional)"
                    onSelect={setMethod}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                    Payment Note
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Advance to supplier"
                    className={inputClass}
                  />
                </div>
                <div>
                  <UploadField
                    label="Payment Receipt"
                    required
                    value={receiptImageUrl}
                    uploading={false}
                    onChange={setReceiptImageUrl}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <UploadField
                label="Bill / Invoice"
                value={billImageUrl}
                uploading={false}
                onChange={setBillImageUrl}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Supplier name, delivery details, etc."
                rows={3}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#0F172A] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#64748B] dark:text-[#94A3B8]">
              Paid{" "}
              <span className="font-semibold text-[#0F172A] dark:text-white">
                {formatMoney(paidForSelection)}
              </span>{" "}
              · Remaining{" "}
              <span
                className={`font-semibold ${
                  remainingAfterPay > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {formatMoney(remainingAfterPay)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {formError && (
                <div className="rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-2.5 text-sm font-medium text-red-600">
                  {formError}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,185,191,0.3)] dark:shadow-none transition-colors hover:bg-[#28a9af] disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Place Order
              </button>
            </div>
          </div>
        </form>
      )}

      {loadError ? (
        <div className="p-6 text-center">
          <p className="text-sm font-medium text-rose-600">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] px-4 py-2 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-[#64748B] dark:text-[#94A3B8]">
          <Loader2 className="h-5 w-5 animate-spin text-[#2FB9BF]" />
          Loading inventory orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <PackageSearch className="h-12 w-12 text-[#CBD5E1]" />
          <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">
            No inventory orders yet
          </h2>
          <p className="mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
            Place your first purchase order to start tracking stock, payments, and
            delivery dates.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormError(null);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28a9af]"
          >
            <Plus className="h-4 w-4" />
            Place order
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                <th className="px-4 py-3 sm:px-6">Order</th>
                <th className="px-4 py-3 sm:px-6">Item</th>
                <th className="px-4 py-3 sm:px-6">Payment</th>
                <th className="px-4 py-3 sm:px-6">Status</th>
                <th className="px-4 py-3 sm:px-6">Delivery</th>
                <th className="px-4 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
              {orders.map((order) => {
                const info = deliveryInfo(order);
                const remaining = Math.max(
                  0,
                  order.totalCost - order.paidAmount
                );
                return (
                  <tr
                    key={order._id}
                    onClick={() => setSelected(order)}
                    className="cursor-pointer align-middle text-sm transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                  >
                    <td className="px-4 py-3.5 sm:px-6">
                      <span className="font-bold text-[#0E7A80] dark:text-[#5EEAD4] hover:underline">
                        {order.orderId}
                      </span>
                      <div className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                        by {order.createdByName}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <span
                        className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${itemTypeClass(
                          order.itemType
                        )}`}
                      >
                        {order.itemType}
                      </span>
                      <span className="text-[#0F172A] dark:text-white">
                        {order.itemName}
                      </span>
                      {orderItems(order).length > 1 && (
                        <span className="ml-2 text-xs font-semibold text-[#94A3B8]">
                          +{orderItems(order).length - 1} more
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${paymentBadgeClass(
                          order.paymentStatus
                        )}`}
                      >
                        {order.paymentStatus}
                      </span>
                      <div className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {formatMoney(order.paidAmount)} of{" "}
                        {formatMoney(order.totalCost)}
                      </div>
                      {order.paymentStatus !== "PAID" && (
                        <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {formatMoney(remaining)} remaining
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      {order.receivedStatus === "RECEIVED" ? (
                        <span
                          title={`Received by ${order.receivedByName ?? "admin"}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Received
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="whitespace-nowrap text-[#475569] dark:text-[#94A3B8]">
                        {formatDate(order.expectedDeliveryDate)}
                      </div>
                      {order.receivedStatus !== "RECEIVED" && info && (
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${deliveryBadgeClass(
                              info.tone
                            )}`}
                          >
                            <Clock className="h-3 w-3" />
                            {info.text}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconAction
                          title="View details"
                          onClick={() => setSelected(order)}
                          tone="teal"
                        >
                          <Eye className="h-4 w-4" />
                        </IconAction>
                        {order.paymentStatus !== "PAID" && (
                          <IconAction
                            title="Add payment"
                            onClick={() => openPaymentModal(order)}
                            tone="teal"
                          >
                            <Banknote className="h-4 w-4" />
                          </IconAction>
                        )}
                        {order.receivedStatus === "PENDING" ? (
                          <IconAction
                            title="Mark order as received"
                            onClick={() => setReceiveOrder(order)}
                            tone="emerald"
                          >
                            <PackageCheck className="h-4 w-4" />
                          </IconAction>
                        ) : (
                          <span
                            title={`Received by ${order.receivedByName ?? "admin"}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        )}
                        <IconAction
                          title="Delete order"
                          onClick={() => setDeleteOrder(order)}
                          tone="red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <OrderDetailsModal order={selected} onClose={() => setSelected(null)} />
      )}

      {paymentOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <form
            onSubmit={handleSubmitPayment}
            className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-5 shadow-xl dark:shadow-none sm:max-h-[90vh] sm:rounded-2xl sm:p-6"
          >
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
              Update Payment — {paymentOrder.orderId}
            </h3>
            <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
              {orderItems(paymentOrder).length} item
              {orderItems(paymentOrder).length === 1 ? "" : "s"} ·{" "}
              {formatMoney(paymentOrder.paidAmount)} paid of{" "}
              {formatMoney(paymentOrder.totalCost)}
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Amount Now Paying (Rs.) <span className="text-red-500">*</span>
              </label>
              <NumberInput
                value={payAdded}
                onValueChange={setPayAdded}
                placeholder="e.g. 5000"
                allowDecimal
                min={0}
                max={Math.max(
                  0,
                  paymentOrder.totalCost - paymentOrder.paidAmount
                )}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                New total paid: {formatMoney(paymentOrder.paidAmount + payAdded)} ·
                Remaining:{" "}
                {formatMoney(
                  Math.max(
                    0,
                    paymentOrder.totalCost - paymentOrder.paidAmount - payAdded
                  )
                )}
              </p>
              {payAdded >
                Math.max(
                  0,
                  paymentOrder.totalCost - paymentOrder.paidAmount
                ) &&
                payAdded > 0 && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-300">
                    Cannot pay more than the remaining balance.
                  </p>
                )}
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Payment Method
              </label>
              <SelectDropdown
                value={payMethod}
                options={METHOD_OPTIONS}
                placeholder="Select method (optional)"
                onSelect={setPayMethod}
              />
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Payment Note
              </label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="e.g. Balance payment on delivery"
                className={inputClass}
              />
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white">
                Payment Receipt <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                {payReceipt ? (
                  <Thumb
                    src={payReceipt}
                    alt="Receipt"
                    className="h-14 w-14 overflow-hidden rounded-xl ring-1 ring-[#E2E8F0] dark:ring-[#1E293B]"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#94A3B8] dark:bg-[#1E293B]">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-[#475569] dark:text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF]">
                      {payUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5" />
                      )}
                      {payUploading ? "Uploading..." : payReceipt ? "Replace" : "Upload"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => void handlePayReceiptUpload(e)}
                      className="hidden"
                    />
                  </label>
                  {payReceipt && (
                    <button
                      type="button"
                      onClick={() => setPayReceipt("")}
                      className="text-left text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {payError && (
              <div className="mt-4 rounded-xl border border-red-200 dark:border-[#334155] bg-red-50 dark:bg-[#1E293B] px-4 py-3 text-sm font-medium text-red-600">
                {payError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentOrder(null)}
                disabled={paySubmitting}
                className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paySubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2FB9BF] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(47,185,191,0.3)] dark:shadow-none transition-colors hover:bg-[#28a9af] disabled:opacity-60"
              >
                {paySubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {receiveOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-5 shadow-xl dark:shadow-none sm:rounded-2xl sm:p-6">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
              Mark order as received?
            </h3>
            <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
              Confirm that {receiveOrder.orderId} ({orderItems(receiveOrder).length}{" "}
              item{orderItems(receiveOrder).length === 1 ? "" : "s"}) has been
              physically received.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiveOrder(null)}
                disabled={receiveLoading}
                className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleMarkReceived()}
                disabled={receiveLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {receiveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Received
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-5 shadow-xl dark:shadow-none sm:rounded-2xl sm:p-6">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
              Delete {deleteOrder.orderId}?
            </h3>
            <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
              This will permanently remove the inventory order and its payment
              records.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOrder(null)}
                disabled={deleteLoading}
                className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
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
  onClose,
}: {
  order: InventoryOrder;
  onClose: () => void;
}) {
  const items = orderItems(order);
  const remaining = Math.max(0, order.totalCost - order.paidAmount);
  const info = deliveryInfo(order);
  const paidPct =
    order.totalCost > 0
      ? Math.min(100, Math.round((order.paidAmount / order.totalCost) * 100))
      : 0;
  const sortedPayments = [...order.payments].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
  const lastMethod = sortedPayments[0]?.method;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] p-5 shadow-xl dark:shadow-none sm:max-h-[90vh] sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                {order.orderId}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${paymentBadgeClass(
                  order.paymentStatus
                )}`}
              >
                {order.paymentStatus}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  order.receivedStatus === "RECEIVED"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                }`}
              >
                {order.receivedStatus === "RECEIVED" ? "Received" : "Pending"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#475569] dark:text-[#94A3B8]">
              {order.itemName}
              {items.length > 1 && (
                <span className="ml-1 text-xs font-semibold text-[#94A3B8]">
                  +{items.length - 1} more
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Placed by {order.createdByName} on {formatTime(order.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:text-[#0F172A] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <SummaryCard label="Order Value" value={formatMoney(order.totalCost)} />
          <SummaryCard
            label="Paid"
            value={formatMoney(order.paidAmount)}
            tone="green"
          />
          <SummaryCard
            label="Remaining"
            value={formatMoney(remaining)}
            tone={remaining > 0 ? "amber" : "green"}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
            <span>Payment progress</span>
            <span>{paidPct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-[#1E293B]">
            <div
              className="h-full rounded-full bg-[#2FB9BF] transition-all"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>

        <div className="mt-5">
          <SectionTitle>Items ({items.length})</SectionTitle>
          <div className="mt-2 space-y-2">
            {items.map((item, idx) => (
              <div
                key={`${order._id}-item-${idx}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] px-3 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${itemTypeClass(
                      item.itemType
                    )}`}
                  >
                    {item.itemType}
                  </span>
                  <span className="truncate text-[#0F172A] dark:text-white">
                    {item.itemName}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-semibold text-[#0F172A] dark:text-white">
                    {item.quantity.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {" "}× {formatMoney(item.totalCost)}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[#E2E8F0] px-3 pt-2 text-sm dark:border-[#1E293B]">
              <span className="font-semibold text-[#64748B] dark:text-[#94A3B8]">
                Total
              </span>
              <span className="font-bold text-[#0F172A] dark:text-white">
                {formatMoney(order.totalCost)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <SectionTitle>Order Details</SectionTitle>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <DetailItem
              label="Payment Status"
              value={order.paymentStatus}
              badge={paymentBadgeClass(order.paymentStatus)}
            />
            <DetailItem
              label="Payment Method"
              value={lastMethod || "Not specified"}
            />
            <DetailItem
              label="Received Status"
              value={order.receivedStatus === "RECEIVED" ? "Received" : "Pending"}
              badge={
                order.receivedStatus === "RECEIVED"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
              }
            />
            <DetailItem
              label="Expected Delivery"
              value={formatDate(order.expectedDeliveryDate)}
            />
            <DetailItem
              label="Delivery"
              value={
                order.receivedStatus === "RECEIVED"
                  ? "Received"
                  : info
                  ? info.text
                  : "—"
              }
              badge={
                order.receivedStatus === "RECEIVED"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : info
                  ? deliveryBadgeClass(info.tone)
                  : undefined
              }
            />
            <DetailItem label="Placed On" value={formatTime(order.createdAt)} />
            <DetailItem label="Placed By" value={order.createdByName} />
            <DetailItem
              label="Received On"
              value={order.receivedAt ? formatTime(order.receivedAt) : "—"}
            />
            <DetailItem
              label="Received By"
              value={order.receivedByName || "—"}
            />
            <DetailItem label="Last Updated" value={formatTime(order.updatedAt)} />
          </div>
        </div>

        {order.notes && (
          <div className="mt-5">
            <SectionTitle>Notes</SectionTitle>
            <p className="mt-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] px-3 py-2.5 text-sm text-[#0F172A] dark:text-white">
              {order.notes}
            </p>
          </div>
        )}

        {(order.billImageUrl || order.receiptImageUrl) && (
          <div className="mt-5">
            <SectionTitle>Documents</SectionTitle>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {order.billImageUrl && (
                <DocCard label="Bill / Invoice" url={order.billImageUrl} />
              )}
              {order.receiptImageUrl && (
                <DocCard label="Payment Receipt" url={order.receiptImageUrl} />
              )}
            </div>
          </div>
        )}

        {sortedPayments.length > 0 && (
          <div className="mt-5">
            <SectionTitle>Payment History ({sortedPayments.length})</SectionTitle>
            <div className="mt-2 space-y-2">
              {sortedPayments.map((payment, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#0F172A] dark:text-white">
                      {formatMoney(payment.amount)}
                    </span>
                    <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {formatTime(payment.recordedAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {payment.method && <span>{payment.method}</span>}
                    {payment.recordedByName && (
                      <span>by {payment.recordedByName}</span>
                    )}
                    {payment.receiptImageUrl && (
                      <a
                        href={payment.receiptImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#2FB9BF] hover:underline"
                      >
                        Receipt <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {payment.note && (
                    <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {payment.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#475569] dark:text-[#94A3B8] hover:border-[#2FB9BF]/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-[#94A3B8]">
        {label}
      </div>
      <div className="mt-0.5 font-semibold text-[#0F172A] dark:text-white">
        {badge ? (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${badge}`}
          >
            {value}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "amber";
}) {
  const toneClass = {
    default: "text-[#0F172A] dark:text-white",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div className="rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] px-3 py-2.5 dark:bg-[#0F172A]">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
        {label}
      </div>
      <div className={`mt-0.5 text-base font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
      {children}
    </h4>
  );
}

function DocCard({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] p-2 transition-colors hover:border-[#2FB9BF]/50"
    >
      <Thumb src={url} alt={label} className="h-14 w-full overflow-hidden rounded-lg" />
      <div className="mt-1.5 flex items-center justify-between px-0.5 text-xs">
        <span className="font-semibold text-[#475569] dark:text-[#94A3B8]">
          {label}
        </span>
        <ExternalLink className="h-3 w-3 text-[#94A3B8] group-hover:text-[#2FB9BF]" />
      </div>
    </a>
  );
}