"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  Megaphone,
  MessageSquare,
  PencilLine,
  PhoneCall,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import SelectDropdown, { type SelectOption } from "@/components/admin/SelectDropdown";
import DatePicker from "@/components/admin/DatePicker";
import TimePicker from "@/components/admin/TimePicker";
import ImageHoverPreview from "@/components/admin/ImageHoverPreview";
import { useToast } from "@/components/admin/toast";
import {
  ApiError,
  addMarketingClientNote,
  addMarketingClientReminder,
  createMarketingClient,
  deleteMarketingClient,
  fetchMarketingClients,
  markMarketingClientChurned,
  snoozeMarketingClientNextOrder,
  updateMarketingClient,
  uploadBottleImage,
  type MarketingClient,
  type MarketingClientReminder,
  type MarketingDealStatus,
  type MarketingFollowUpStatus,
} from "@/lib/admin-api";
import { subscribeMarketingNotification } from "@/lib/admin-socket";
import Link from "next/link";

const DEAL_STATUS_OPTIONS: SelectOption[] = [
  { label: "Pending Visit", value: "PENDING_VISIT" },
  { label: "Visited / In Progress", value: "VISITED_IN_PROGRESS" },
  { label: "Deal Closed / Won", value: "DEAL_CLOSED_WON" },
  { label: "Deal Lost / Not Interested", value: "DEAL_LOST_NOT_INTERESTED" },
  { label: "Not a Client Anymore", value: "NOT_A_CLIENT_ANYMORE" },
];

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { label: "All statuses", value: "" },
  ...DEAL_STATUS_OPTIONS,
];

type SortKey = "businessName" | "dealStatus" | "nextReminderAt" | "updatedAt";

const inputClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white";

const cardClass =
  "rounded-2xl border border-[#E2E8F0] bg-white p-4 dark:border-[#1E293B] dark:bg-[#0F172A] sm:p-5";

const labelClass =
  "mb-1.5 block text-sm font-medium text-[#0F172A] dark:text-white";

const subLabelClass =
  "mb-1.5 block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2FB9BF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#28A7AC] disabled:opacity-60";

const ghostButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF] disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]";

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
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function todayValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function truncateWords(text: string, count: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return text.trim();
  return `${words.slice(0, count).join(" ")}…`;
}

const STATUS_LABELS: Record<MarketingDealStatus, string> = {
  PENDING_VISIT: "Pending Visit",
  VISITED_IN_PROGRESS: "Visited / In Progress",
  DEAL_CLOSED_WON: "Deal Closed / Won",
  DEAL_LOST_NOT_INTERESTED: "Deal Lost / Not Interested",
  NOT_A_CLIENT_ANYMORE: "Not a Client Anymore",
};

function statusLabel(status: MarketingDealStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function dealStatusBadgeClass(status: MarketingDealStatus): string {
  switch (status) {
    case "DEAL_CLOSED_WON":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    case "VISITED_IN_PROGRESS":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
    case "DEAL_LOST_NOT_INTERESTED":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    case "NOT_A_CLIENT_ANYMORE":
      return "bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
}

const FOLLOW_UP_LABELS: Record<MarketingFollowUpStatus, string> = {
  PENDING: "Upcoming",
  OVERDUE: "Overdue",
  SNOOZED: "Extended",
};

function isActiveClient(client: MarketingClient): boolean {
  return client.dealStatus === "DEAL_CLOSED_WON";
}

function safeNotes(client: MarketingClient) {
  return Array.isArray(client.notes) ? client.notes : [];
}

function safeReminders(client: MarketingClient) {
  return Array.isArray(client.reminders) ? client.reminders : [];
}

function safeAssets(client: MarketingClient) {
  return Array.isArray(client.designAssets) ? client.designAssets : [];
}

function nextReminder(client: MarketingClient): MarketingClientReminder | null {
  const upcoming = safeReminders(client)
    .filter((r) => !r.alertedAt)
    .sort(
      (a, b) => new Date(a.reminderAt).getTime() - new Date(b.reminderAt).getTime()
    );
  return upcoming[0] ?? null;
}

function nextOrderReminderAt(client: MarketingClient): string | null {
  return client.nextOrderReminderAt ?? null;
}

function daysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function followUpBadgeClass(status?: MarketingFollowUpStatus): string {
  switch (status) {
    case "OVERDUE":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    case "SNOOZED":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    case "PENDING":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
    default:
      return "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E293B] dark:text-[#94A3B8]";
  }
}

function latestNote(client: MarketingClient) {
  const notes = [...safeNotes(client)].sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });
  return notes[0] ?? null;
}

interface Countdown {
  text: string;
  tone: "future" | "today" | "overdue";
}

function reminderCountdown(iso: string): Countdown {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { text: "—", tone: "future" };
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { text: "Today", tone: "today" };
  if (diff > 0) {
    return { text: `${diff} day${diff === 1 ? "" : "s"} left`, tone: "future" };
  }
  const over = Math.abs(diff);
  return { text: `${over} day${over === 1 ? "" : "s"} overdue`, tone: "overdue" };
}

function countdownBadgeClass(tone: Countdown["tone"]): string {
  switch (tone) {
    case "overdue":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    case "today":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    default:
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
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

export default function MarketingPage() {
  const toast = useToast();

  const [clients, setClients] = useState<MarketingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [showForm, setShowForm] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappSame, setWhatsappSame] = useState(false);
  const [dealStatus, setDealStatus] = useState<MarketingDealStatus | "">(
    "PENDING_VISIT"
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [designAssets, setDesignAssets] = useState<string[]>([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState(todayValue());
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState<MarketingClient | null>(null);
  const [statusTarget, setStatusTarget] = useState<MarketingClient | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MarketingClient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchMarketingClients();
      setClients(data);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load marketing clients."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    return subscribeMarketingNotification(() => {
      void load(true);
    });
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("open");
    if (openId && !selected) {
      const found = clients.find((c) => c._id === openId);
      if (found) setSelected(found);
    }
  }, [clients, selected]);

  const overdueClients = useMemo(
    () => clients.filter((c) => c.followUpStatus === "OVERDUE"),
    [clients]
  );

  const sortedClients = useMemo(() => {
    const filtered = clients.filter((c) => {
      if (statusFilter && c.dealStatus !== statusFilter) return false;
      const q = debouncedSearch.trim().toLowerCase();
      if (q) {
        const haystack = [
          c.businessName,
          c.ownerName ?? "",
          c.phone ?? "",
          c.whatsapp ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    const reminderValue = (c: MarketingClient) => nextReminder(c)?.reminderAt ?? "";
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "businessName":
          return a.businessName.localeCompare(b.businessName) * dir;
        case "dealStatus":
          return a.dealStatus.localeCompare(b.dealStatus) * dir;
        case "nextReminderAt":
          return reminderValue(a).localeCompare(reminderValue(b)) * dir;
        default:
          return (
            (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) *
            dir
          );
      }
    });
  }, [clients, statusFilter, debouncedSearch, sortKey, sortDir]);

  function toggleSort(next: SortKey) {
    if (next === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(next);
      setSortDir("desc");
    }
  }

  async function handleDesignUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAsset(true);
    try {
      const result = await uploadBottleImage(file, "marketing-clients");
      setDesignAssets((current) => [...current, result.url]);
      toast.success("Design uploaded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Design upload failed.");
    } finally {
      setUploadingAsset(false);
      e.target.value = "";
    }
  }

  function resetForm() {
    setBusinessName("");
    setOwnerName("");
    setPhone("");
    setWhatsapp("");
    setWhatsappSame(false);
    setDealStatus("PENDING_VISIT");
    setRejectionReason("");
    setDesignAssets([]);
    setNoteText("");
    setNoteDate(todayValue());
    setReminderDate("");
    setReminderTime("");
    setReminderMessage("");
    setFormError(null);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!businessName.trim()) {
      setFormError("Business name is required.");
      return;
    }
    if (!dealStatus) {
      setFormError("Select a deal status.");
      return;
    }
    if (dealStatus === "DEAL_LOST_NOT_INTERESTED" && !rejectionReason.trim()) {
      setFormError("Rejection reason is required when the deal is lost.");
      return;
    }
    if (reminderTime && !reminderDate) {
      setFormError("Select a reminder date too.");
      return;
    }
    const reminderAt = reminderDate
      ? `${reminderDate}T${reminderTime || "12:00"}`
      : "";
    if (reminderAt && !reminderMessage.trim()) {
      setFormError("A reminder message is required when a reminder is set.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createMarketingClient({
        businessName: businessName.trim(),
        ownerName: ownerName.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: (whatsappSame ? phone.trim() : whatsapp.trim()) || undefined,
        designAssets,
        dealStatus,
        rejectionReason: rejectionReason.trim() || undefined,
        noteText: noteText.trim() || undefined,
        noteDate: noteDate || undefined,
        reminderAt: reminderAt || undefined,
        reminderMessage: reminderMessage.trim() || undefined,
      });
      setClients((current) => [created, ...current]);
      toast.success(`Added ${created.businessName} to your pipeline.`);
      closeForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to add client.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleMutated(updated: MarketingClient) {
    setClients((current) =>
      current.map((c) => (c._id === updated._id ? updated : c))
    );
    setSelected((current) =>
      current && current._id === updated._id ? updated : current
    );
    setStatusTarget((current) =>
      current && current._id === updated._id ? updated : current
    );
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteMarketingClient(confirmDelete._id);
      setClients((current) => current.filter((c) => c._id !== confirmDelete._id));
      setSelected(null);
      setConfirmDelete(null);
      toast.success(`Deleted ${confirmDelete.businessName}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete client.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminPage
      title="Marketing"
      description="Manage potential clients, track follow-ups, and close deals."
    >
      <div className="flex flex-col gap-3 border-b border-[#F1F5F9] p-4 dark:border-[#1E293B] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8]">
          {clients.length} {clients.length === 1 ? "client" : "clients"} in pipeline
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full rounded-xl border border-[#E2E8F0] bg-white py-2.5 pl-9 pr-3 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
            />
          </div>
          <div className="sm:w-44">
            <SelectDropdown
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              placeholder="All statuses"
              onSelect={setStatusFilter}
            />
          </div>
          <button
            type="button"
            onClick={() => (showForm ? closeForm() : setShowForm(true))}
            className={`${primaryButtonClass} w-full sm:w-auto`}
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "Add Client"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="border-b border-[#F1F5F9] p-4 dark:border-[#1E293B] sm:p-6">
          <form
            onSubmit={handleCreate}
            className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]/60 p-4 dark:border-[#1E293B] dark:bg-[#0B1220] sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF9F9] text-[#2FB9BF] dark:bg-[#123738]">
                <Megaphone className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                  New Marketing Client
                </h3>
                <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
                  Add a lead to your pipeline and schedule the first follow-up.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Alpino Beverages"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Umar"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>WhatsApp</label>
                <input
                  type="text"
                  value={whatsappSame ? phone : whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+92 300 1234567"
                  className={inputClass}
                  readOnly={whatsappSame}
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#E2E8F0] text-[#2FB9BF] focus:ring-[#2FB9BF]/30"
                    checked={whatsappSame}
                    onChange={(e) => setWhatsappSame(e.target.checked)}
                  />
                  Same as phone number
                </label>
              </div>

              <div>
                <label className={labelClass}>
                  Deal Status <span className="text-red-500">*</span>
                </label>
                <SelectDropdown
                  value={dealStatus}
                  options={DEAL_STATUS_OPTIONS}
                  onSelect={(v) => setDealStatus(v as MarketingDealStatus)}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className={labelClass}>Design Assets</label>
                <div className="flex flex-wrap items-center gap-2">
                  {designAssets.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-[#E2E8F0] dark:ring-[#1E293B]"
                    >
                      <Thumb
                        src={url}
                        alt={`Design ${index + 1}`}
                        className="h-full w-full"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDesignAssets((current) =>
                            current.filter((_, j) => j !== index)
                          )
                        }
                        title="Remove design"
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-600 p-0.5 text-white shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#E2E8F0] text-[#94A3B8] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF] dark:border-[#334155]">
                    {uploadingAsset ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleDesignUpload(e)}
                    />
                  </label>
                </div>
                <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {designAssets.length === 0
                    ? "Upload label design mockups."
                    : `${designAssets.length} design image${
                        designAssets.length === 1 ? "" : "s"
                      } added`}
                </p>
              </div>

              {dealStatus === "DEAL_LOST_NOT_INTERESTED" && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelClass}>
                    Reason for Rejection / Lost Deal{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Chose a competitor, budget constraints, not interested in glass bottles."
                    className={inputClass}
                  />
                </div>
              )}

              <div className="sm:col-span-2 lg:col-span-2">
                <label className={labelClass}>Notes &amp; Call Log</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="Initial conversation, follow-up details..."
                  className={inputClass}
                />
                <div className="mt-2">
                  <label className={subLabelClass}>Note Date</label>
                  <DatePicker
                    value={noteDate}
                    onChange={setNoteDate}
                    placeholder="Select note date"
                    label="Note date"
                    presets={[]}
                    allowPast
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Reminder</label>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <DatePicker
                      value={reminderDate}
                      onChange={setReminderDate}
                      placeholder="Pick a date"
                      label="Reminder date"
                      allowPast
                    />
                  </div>
                  <div className="w-32 shrink-0">
                    <TimePicker
                      value={reminderTime}
                      onChange={setReminderTime}
                      label="Reminder time"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className={subLabelClass}>Reminder Message</label>
                  <input
                    type="text"
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    placeholder="e.g. Call to discuss sample order"
                    className={inputClass}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Triggers an in-app notification when it is due.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#E2E8F0] pt-5 dark:border-[#1E293B] sm:flex-row sm:items-center sm:justify-between">
              {formError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:border-[#4C1D24] dark:bg-rose-900/20 dark:text-rose-300">
                  {formError}
                </p>
              ) : (
                <span className="hidden text-xs text-[#94A3B8] sm:block">
                  Fields marked <span className="text-red-500">*</span> are required.
                </span>
              )}
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={closeForm} className={ghostButtonClass}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={primaryButtonClass}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add Client
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {overdueClients.length > 0 && (
        <div className="border-b border-rose-100 bg-rose-50 p-4 dark:border-[#4C1D24] dark:bg-rose-950/30 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-rose-600 dark:text-rose-300" />
            <h3 className="text-sm font-bold text-rose-700 dark:text-rose-200">
              {overdueClients.length}{" "}
              {overdueClients.length === 1
                ? "client has"
                : "clients have"}{" "}
              not placed a follow-up order — contact them to re-order
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdueClients.map((client) => (
              <button
                key={client._id}
                type="button"
                onClick={() => setSelected(client)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:border-rose-400 dark:border-[#4C1D24] dark:bg-[#0F172A] dark:text-rose-200"
              >
                <Users className="h-3.5 w-3.5" />
                {client.businessName}
                <span className="text-[11px] font-medium text-rose-400 dark:text-rose-300">
                  · due {formatDate(client.nextOrderReminderAt ?? undefined)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loadError ? (
        <div className="p-6 text-center">
          <p className="text-sm font-medium text-rose-600">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className={`${ghostButtonClass} mt-3`}
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 p-16 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
          <Loader2 className="h-5 w-5 animate-spin text-[#2FB9BF]" />
          Loading marketing clients...
        </div>
      ) : sortedClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Megaphone className="h-12 w-12 text-[#CBD5E1]" />
          <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">
            {clients.length === 0
              ? "No marketing clients yet"
              : "No clients match your filters"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-[#64748B] dark:text-[#94A3B8]">
            {clients.length === 0
              ? "Add your first potential client to start tracking leads and deals."
              : "Try changing the search or deal status filter."}
          </p>
          {clients.length === 0 && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className={`${primaryButtonClass} mt-5`}
            >
              <Plus className="h-4 w-4" />
              Add Client
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-xs font-bold uppercase tracking-wider text-[#64748B] dark:border-[#1E293B] dark:text-[#94A3B8]">
                <th className="px-4 py-3 sm:px-6">
                  <SortHeader
                    label="Client"
                    active={sortKey === "businessName"}
                    dir={sortDir}
                    onClick={() => toggleSort("businessName")}
                  />
                </th>
                <th className="px-4 py-3 sm:px-6">
                  <SortHeader
                    label="Status"
                    active={sortKey === "dealStatus"}
                    dir={sortDir}
                    onClick={() => toggleSort("dealStatus")}
                  />
                </th>
                <th className="px-4 py-3 sm:px-6">Latest Note</th>
                <th className="px-4 py-3 sm:px-6">
                  <SortHeader
                    label="Reminders"
                    active={sortKey === "nextReminderAt"}
                    dir={sortDir}
                    onClick={() => toggleSort("nextReminderAt")}
                  />
                </th>
                <th className="px-4 py-3 sm:px-6">Next Order</th>
                <th className="px-4 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
              {sortedClients.map((client) => {
                const next = nextReminder(client);
                const note = latestNote(client);
                const countdown = next ? reminderCountdown(next.reminderAt) : null;
                const nextOrder = nextOrderReminderAt(client);
                const followUp = client.followUpStatus;
                const nextOrderCountdown = nextOrder
                  ? reminderCountdown(nextOrder)
                  : null;
                return (
                  <tr
                    key={client._id}
                    onClick={() => setSelected(client)}
                    className="cursor-pointer align-top text-sm transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]"
                  >
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-start gap-3">
                        <UserIcon />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[#0F172A] dark:text-white">
                            {client.businessName}
                          </p>
                          <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                            Added {formatDate(client.createdAt)}
                            {client.createdByName
                              ? ` by ${client.createdByName}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${dealStatusBadgeClass(
                          client.dealStatus
                        )}`}
                      >
                        {statusLabel(client.dealStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      {note ? (
                        <div className="max-w-[220px]">
                          <p className="text-sm text-[#0F172A] dark:text-white">
                            {truncateWords(note.text, 8)}
                          </p>
                          <p className="mt-0.5 text-xs text-[#94A3B8]">
                            {formatDate(note.date)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      {next && countdown ? (
                        <div className="max-w-[200px]">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${countdownBadgeClass(
                              countdown.tone
                            )}`}
                          >
                            <Clock className="h-3 w-3" />
                            {countdown.text}
                          </span>
                          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                            {truncateWords(next.message, 6)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      {nextOrder && followUp && nextOrderCountdown ? (
                        <div className="max-w-[200px]">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${followUpBadgeClass(
                              followUp
                            )}`}
                          >
                            <Clock className="h-3 w-3" />
                            {followUp === "OVERDUE"
                              ? "Needs contact"
                              : FOLLOW_UP_LABELS[followUp]}
                          </span>
                          <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                            {formatDate(nextOrder)} · {nextOrderCountdown.text}
                          </p>
                        </div>
                      ) : isActiveClient(client) ? (
                        <span className="text-xs text-[#94A3B8]">
                          Set on next order
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconAction
                          label="Follow up / view details"
                          tone="teal"
                          onClick={() => setSelected(client)}
                        >
                          <Eye className="h-4 w-4" />
                        </IconAction>
                        <IconAction
                          label="Update status"
                          tone="violet"
                          onClick={() => setStatusTarget(client)}
                        >
                          <PencilLine className="h-4 w-4" />
                        </IconAction>
                        <IconAction
                          label="Delete client"
                          tone="rose"
                          onClick={() => setConfirmDelete(client)}
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
        <ClientDetailsModal
          key={selected._id}
          client={selected}
          onClose={() => setSelected(null)}
          onMutated={handleMutated}
          onDeleteRequest={setConfirmDelete}
        />
      )}

      {statusTarget && (
        <StatusUpdateModal
          key={`status-${statusTarget._id}`}
          client={statusTarget}
          onClose={() => setStatusTarget(null)}
          onMutated={(updated) => {
            handleMutated(updated);
            setStatusTarget(null);
          }}
        />
      )}

      {confirmDelete && (
        <DeleteDialog
          client={confirmDelete}
          deleting={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </AdminPage>
  );
}

function UserIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF9F9] text-[#2FB9BF] dark:bg-[#123738]">
      <Users className="h-4 w-4" />
    </span>
  );
}

function IconAction({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone: "teal" | "violet" | "rose";
  onClick: () => void;
  children: ReactNode;
}) {
  const toneClass = {
    teal: "hover:bg-[#EEF9F9] hover:text-[#2FB9BF] dark:hover:bg-[#123738]",
    violet: "hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20",
    rose: "hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20",
  }[tone];
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition-colors dark:text-[#94A3B8] ${toneClass}`}
    >
      {children}
    </button>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-1.5 transition-colors ${
        active
          ? "text-[#0F172A] dark:text-white"
          : "hover:text-[#0F172A] dark:hover:text-white"
      }`}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
      )}
    </button>
  );
}

function StatusUpdateModal({
  client,
  onClose,
  onMutated,
}: {
  client: MarketingClient;
  onClose: () => void;
  onMutated: (updated: MarketingClient) => void;
}) {
  const toast = useToast();
  const [statusValue, setStatusValue] = useState<MarketingDealStatus>(
    client.dealStatus
  );
  const [reasonValue, setReasonValue] = useState(
    client.cancellationReason ?? client.rejectionReason ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lost = statusValue === "DEAL_LOST_NOT_INTERESTED";
  const churned = statusValue === "NOT_A_CLIENT_ANYMORE";

  async function handleSave() {
    if (statusValue === "DEAL_LOST_NOT_INTERESTED" && !reasonValue.trim()) {
      setError("Rejection reason is required when the deal is lost.");
      return;
    }
    if (churned && !reasonValue.trim()) {
      setError("Reason for leaving / cancellation is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMarketingClient(client._id, {
        dealStatus: statusValue,
        rejectionReason: lost ? reasonValue.trim() : undefined,
        cancellationReason: churned ? reasonValue.trim() : undefined,
      });
      toast.success(`Status updated to ${statusLabel(updated.dealStatus)}.`);
      onMutated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl border border-[#E2E8F0] bg-white p-5 shadow-xl dark:border-[#1E293B] dark:bg-[#0F172A] sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserIcon />
            <div>
              <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                Update Status
              </h3>
              <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
                {client.businessName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:text-[#0F172A] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-[#94A3B8]">Current:</span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${dealStatusBadgeClass(
              client.dealStatus
            )}`}
          >
            {statusLabel(client.dealStatus)}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className={subLabelClass}>New Status</label>
            <SelectDropdown
              value={statusValue}
              options={DEAL_STATUS_OPTIONS}
              onSelect={(v) => setStatusValue(v as MarketingDealStatus)}
            />
          </div>
          {(lost || churned) && (
            <div>
              <label className={subLabelClass}>
                {churned
                  ? "Reason for Leaving / Cancellation"
                  : "Reason for Rejection / Lost Deal"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reasonValue}
                onChange={(e) => setReasonValue(e.target.value)}
                rows={3}
                placeholder={
                  churned
                    ? "Required when the client is marked as not a client anymore."
                    : "Required when the deal is lost."
                }
                className={inputClass}
              />
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 dark:border-[#4C1D24] dark:bg-rose-900/20 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={primaryButtonClass}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Status
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDialog({
  client,
  deleting,
  onCancel,
  onConfirm,
}: {
  client: MarketingClient;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl border border-[#E2E8F0] bg-white p-5 shadow-xl dark:border-[#1E293B] dark:bg-[#0F172A] sm:rounded-2xl sm:p-6">
        <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
          Delete {client.businessName}?
        </h3>
        <p className="mt-1 text-sm text-[#64748B] dark:text-[#94A3B8]">
          This permanently removes the client, their design assets, notes, and
          reminders. This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className={ghostButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientDetailsModal({
  client,
  onClose,
  onMutated,
  onDeleteRequest,
}: {
  client: MarketingClient;
  onClose: () => void;
  onMutated: (updated: MarketingClient) => void;
  onDeleteRequest: (client: MarketingClient) => void;
}) {
  const toast = useToast();

  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState(todayValue());
  const [noteSaving, setNoteSaving] = useState(false);

  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderMsg, setReminderMsg] = useState("");
  const [reminderSaving, setReminderSaving] = useState(false);

  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState("");
  const [followUpSaving, setFollowUpSaving] = useState(false);

  const [churnOpen, setChurnOpen] = useState(false);
  const [churnReason, setChurnReason] = useState("");
  const [churnSaving, setChurnSaving] = useState(false);

  const [uploadingAsset, setUploadingAsset] = useState(false);

  const assets = safeAssets(client);

  const sortedNotes = useMemo(
    () =>
      [...safeNotes(client)].sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime() ||
          new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
      ),
    [client]
  );

  const sortedReminders = useMemo(
    () =>
      [...safeReminders(client)].sort(
        (a, b) =>
          new Date(a.reminderAt).getTime() - new Date(b.reminderAt).getTime()
      ),
    [client]
  );

  async function handleAddNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!noteText.trim()) {
      toast.error("Note text is required.");
      return;
    }
    setNoteSaving(true);
    try {
      const updated = await addMarketingClientNote(client._id, {
        text: noteText.trim(),
        date: noteDate || undefined,
      });
      onMutated(updated);
      setNoteText("");
      toast.success("Note added to call log.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add note.");
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleAddReminder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reminderDate) {
      toast.error("Reminder date is required.");
      return;
    }
    if (!reminderMsg.trim()) {
      toast.error("Reminder message is required.");
      return;
    }
    setReminderSaving(true);
    try {
      const updated = await addMarketingClientReminder(client._id, {
        reminderAt: `${reminderDate}T${reminderTime || "12:00"}`,
        message: reminderMsg.trim(),
      });
      onMutated(updated);
      setReminderDate("");
      setReminderTime("");
      setReminderMsg("");
      toast.success("Reminder scheduled. You will be notified when it is due.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add reminder.");
    } finally {
      setReminderSaving(false);
    }
  }

  async function handleSnoozeNextOrder() {
    if (!snoozeDate) {
      toast.error("Pick a new next order reminder date.");
      return;
    }
    setFollowUpSaving(true);
    try {
      const updated = await snoozeMarketingClientNextOrder(client._id, {
        nextOrderReminderAt: `${snoozeDate}T12:00:00`,
      });
      onMutated(updated);
      setSnoozeOpen(false);
      setSnoozeDate("");
      toast.success("Next order reminder extended.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Failed to extend next order reminder."
      );
    } finally {
      setFollowUpSaving(false);
    }
  }

  function openSnooze() {
    setSnoozeDate(
      client.nextOrderReminderAt
        ? client.nextOrderReminderAt.slice(0, 10)
        : daysFromToday(14)
    );
    setChurnOpen(false);
    setSnoozeOpen((open) => !open);
  }

  function openChurn() {
    setChurnReason("");
    setSnoozeOpen(false);
    setChurnOpen((open) => !open);
  }

  async function handleChurn() {
    const reason = churnReason.trim();
    if (!reason) {
      toast.error("Reason for leaving / cancellation is required.");
      return;
    }
    setChurnSaving(true);
    try {
      const updated = await markMarketingClientChurned(client._id, {
        cancellationReason: reason,
      });
      onMutated(updated);
      setChurnOpen(false);
      setChurnReason("");
      toast.success("Marked as not a client anymore.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update client status."
      );
    } finally {
      setChurnSaving(false);
    }
  }

  async function handleRemoveAsset(url: string) {
    try {
      const updated = await updateMarketingClient(client._id, {
        designAssets: assets.filter((a) => a !== url),
      });
      onMutated(updated);
      toast.success("Design asset removed.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove asset.");
    }
  }

  async function handleAddAsset(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAsset(true);
    try {
      const result = await uploadBottleImage(file, "marketing-clients");
      const updated = await updateMarketingClient(client._id, {
        designAssets: [...assets, result.url],
      });
      onMutated(updated);
      toast.success("Design asset added.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploadingAsset(false);
      e.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#E2E8F0] bg-white shadow-xl dark:border-[#1E293B] dark:bg-[#0F172A] sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#F1F5F9] p-4 dark:border-[#1E293B] sm:p-6">
          <div className="flex items-center gap-3">
            <UserIcon />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-bold text-[#0F172A] dark:text-white">
                  {client.businessName}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${dealStatusBadgeClass(
                    client.dealStatus
                  )}`}
                >
                  {statusLabel(client.dealStatus)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Added {formatDate(client.createdAt)}
                {client.createdByName ? ` by ${client.createdByName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:text-[#0F172A] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {client.dealStatus === "DEAL_LOST_NOT_INTERESTED" &&
            client.rejectionReason && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-[#4C1D24] dark:bg-rose-900/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300">
                  Reason for Rejection / Lost Deal
                </h4>
                <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">
                  {client.rejectionReason}
                </p>
              </div>
            )}

          {client.dealStatus === "NOT_A_CLIENT_ANYMORE" &&
            client.cancellationReason && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-[#334155] dark:bg-slate-900/30">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Reason for Leaving / Cancellation
                </h4>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {client.cancellationReason}
                </p>
              </div>
            )}

          <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Design Assets ({assets.length})
                </h4>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF] dark:border-[#334155] dark:text-[#94A3B8]">
                  {uploadingAsset ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  Add Image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleAddAsset(e)}
                />
              </label>
            </div>
            {assets.length === 0 ? (
              <p className="mt-3 text-sm text-[#64748B] dark:text-[#94A3B8]">
                No design assets uploaded yet.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {assets.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="overflow-hidden rounded-xl ring-1 ring-[#E2E8F0] dark:ring-[#1E293B]"
                  >
                    <div className="h-28 w-full overflow-hidden bg-[#F8FAFC] dark:bg-[#1E293B]">
                      <Thumb
                        src={url}
                        alt={`Design ${index + 1}`}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] px-2.5 py-2 dark:border-[#1E293B]">
                      <a
                        href={url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2FB9BF] hover:underline"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleRemoveAsset(url)}
                        title="Remove asset"
                        className="rounded-lg p-1 text-[#94A3B8] transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(isActiveClient(client) || client.followUpStatus) && (
            <div className={cardClass}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next Order Reminder
                </h4>
                {client.followUpStatus && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${followUpBadgeClass(
                      client.followUpStatus
                    )}`}
                  >
                    {client.followUpStatus === "OVERDUE"
                      ? "Overdue — needs contact"
                      : FOLLOW_UP_LABELS[client.followUpStatus]}
                  </span>
                )}
              </div>

              {client.nextOrderReminderAt ? (
                <div className="mt-3 space-y-1.5 rounded-xl bg-[#F8FAFC] px-3 py-2.5 text-sm dark:bg-[#1E293B]">
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">
                      Expected next order
                    </span>
                    <span className="font-semibold text-[#0F172A] dark:text-white">
                      {formatDate(client.nextOrderReminderAt)}
                      <span className="ml-1.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                        · {reminderCountdown(client.nextOrderReminderAt).text}
                      </span>
                    </span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">
                      Last order
                    </span>
                    <span className="font-semibold text-[#0F172A] dark:text-white">
                      {formatDate(client.lastOrderAt ?? undefined)}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#64748B] dark:text-[#94A3B8]">
                  A next-order reminder will be scheduled when their next order
                  is created.
                </p>
              )}

              {isActiveClient(client) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/orders/create?client=${client._id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2FB9BF] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#28A7AC]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Place New Order
                  </Link>
                  <button
                    type="button"
                    onClick={openSnooze}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                      snoozeOpen
                        ? "border-[#2FB9BF] bg-[#2FB9BF]/10 text-[#0E7A80] dark:text-[#5EEAD4]"
                        : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
                    }`}
                  >
                    {followUpSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    Snooze / Extend
                  </button>
                  <button
                    type="button"
                    onClick={openChurn}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                      churnOpen
                        ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
                        : "border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-[#4C1D24] dark:bg-[#0F172A] dark:text-rose-300"
                    }`}
                  >
                    {churnSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Mark as Churned
                  </button>
                </div>
              )}

              {snoozeOpen && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSnoozeNextOrder();
                  }}
                  className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-[#1E293B] dark:bg-[#1E293B]"
                >
                  <label className={subLabelClass}>New expected date</label>
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <DatePicker
                        value={snoozeDate}
                        onChange={setSnoozeDate}
                        placeholder="Pick a date"
                        label="Next order reminder date"
                        allowPast={false}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={followUpSaving}
                      className={`${primaryButtonClass} shrink-0`}
                    >
                      {followUpSaving && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Save
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Use this when the client still has remaining stock and they
                    need more time.
                  </p>
                </form>
              )}

              {churnOpen && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-[#4C1D24] dark:bg-rose-900/10">
                  <label className={subLabelClass}>
                    Reason for Leaving / Cancellation{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={churnReason}
                    onChange={(e) => setChurnReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Switched to another supplier, no longer needs bottles..."
                    className={inputClass}
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setChurnOpen(false)}
                      disabled={churnSaving}
                      className={ghostButtonClass}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleChurn()}
                      disabled={churnSaving}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                    >
                      {churnSaving && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Confirm Churn
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={cardClass}>
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              <CalendarClock className="h-3.5 w-3.5" />
              Reminders ({sortedReminders.length})
            </h4>
            {sortedReminders.length > 0 && (
              <div className="mt-3 space-y-2">
                {sortedReminders.map((reminder) => {
                  const overdue =
                    !reminder.alertedAt &&
                    new Date(reminder.reminderAt).getTime() < Date.now();
                  const countdown = reminderCountdown(reminder.reminderAt);
                  return (
                    <div
                      key={reminder._id}
                      className="flex items-start justify-between gap-3 rounded-xl bg-[#F8FAFC] px-3 py-2.5 dark:bg-[#1E293B]"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 shrink-0 ${
                            overdue
                              ? "text-rose-500"
                              : reminder.alertedAt
                              ? "text-emerald-500"
                              : "text-violet-500"
                          }`}
                        >
                          {reminder.alertedAt ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : overdue ? (
                            <BellRing className="h-4 w-4" />
                          ) : (
                            <Bell className="h-4 w-4" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                            {formatTime(reminder.reminderAt)}
                          </p>
                          <p className="mt-0.5 text-sm text-[#475569] dark:text-[#94A3B8]">
                            {reminder.message}
                          </p>
                          <p className="mt-1 text-[11px] text-[#94A3B8]">
                            {reminder.alertedAt
                              ? "Notified"
                              : countdown.text}{" "}
                            · Set by {reminder.createdByName || "an admin"}
                          </p>
                        </div>
                      </div>
                      {reminder.alertedAt ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Notified
                        </span>
                      ) : overdue ? (
                        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                          Due
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                          Upcoming
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <form
              onSubmit={(e) => void handleAddReminder(e)}
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start"
            >
              <div className="sm:w-44">
                <DatePicker
                  value={reminderDate}
                  onChange={setReminderDate}
                  placeholder="Pick a date"
                  label="Reminder date"
                  allowPast
                />
              </div>
              <div className="sm:w-32">
                <TimePicker
                  value={reminderTime}
                  onChange={setReminderTime}
                  label="Reminder time"
                />
              </div>
              <input
                type="text"
                value={reminderMsg}
                onChange={(e) => setReminderMsg(e.target.value)}
                placeholder="e.g. Call to follow up on quote"
                className={`${inputClass} min-w-0 flex-1`}
              />
              <button
                type="submit"
                disabled={reminderSaving}
                className={`${primaryButtonClass} shrink-0`}
              >
                {reminderSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Set
              </button>
            </form>
          </div>

          <div className={cardClass}>
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
              <PhoneCall className="h-3.5 w-3.5" />
              Notes &amp; Call Log ({sortedNotes.length})
            </h4>
            {sortedNotes.length > 0 && (
              <div className="relative mt-4 space-y-4 before:absolute before:bottom-1 before:left-[11px] before:top-1 before:w-px before:bg-[#E2E8F0] dark:before:bg-[#1E293B]">
                {sortedNotes.map((note) => (
                  <div key={note._id} className="relative flex items-start gap-3">
                    <span className="z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF9F9] text-[#2FB9BF] dark:bg-[#123738]">
                      <MessageSquare className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                        {formatTime(note.date)}
                        {note.createdByName && (
                          <span className="font-normal text-[#94A3B8]">
                            · {note.createdByName}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-[#0F172A] dark:text-white">
                        {note.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={(e) => void handleAddNote(e)} className="mt-4 space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="Add a dated note about the call, meeting, or follow-up..."
                className={inputClass}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="sm:w-48">
                  <DatePicker
                    value={noteDate}
                    onChange={setNoteDate}
                    placeholder="Select note date"
                    label="Note date"
                    presets={[]}
                    allowPast
                  />
                </div>
                <button
                  type="submit"
                  disabled={noteSaving}
                  className={`${primaryButtonClass} shrink-0`}
                >
                  {noteSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  Add Note
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#F1F5F9] p-4 dark:border-[#1E293B] sm:p-6">
          <button
            type="button"
            onClick={() => onDeleteRequest(client)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-[#4C1D24] dark:hover:bg-rose-900/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <button type="button" onClick={onClose} className={ghostButtonClass}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
