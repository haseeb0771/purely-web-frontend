"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import {
  ApiError,
  deleteInquiry,
  fetchInquiries,
  fetchInquirySummary,
  updateInquiryStatus,
  type Inquiry,
  type InquiryStatus,
  type InquirySummary,
} from "@/lib/admin-api";
import { subscribeNewInquiry } from "@/lib/admin-socket";

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  replied: "Replied",
  archived: "Archived",
};

const STATUS_BADGE: Record<InquiryStatus, string> = {
  new: "bg-[#2FB9BF]/10 text-[#0E7A80] ring-[#2FB9BF]/30 dark:bg-[#2FB9BF]/10 dark:text-[#5EEAD4] dark:ring-[#2FB9BF]/30",
  replied:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  archived:
    "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30",
};

type Filter = "all" | InquiryStatus;

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "replied", label: "Replied" },
  { key: "archived", label: "Archived" },
];

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const EMPTY_SUMMARY: InquirySummary = {
  total: 0,
  totalNew: 0,
  totalReplied: 0,
  totalArchived: 0,
};

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [summary, setSummary] = useState<InquirySummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInquiries({
        page,
        pageSize,
        status: filter === "all" ? undefined : filter,
        search: search || undefined,
      });
      setInquiries(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load inquiries."
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filter, search]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await fetchInquirySummary());
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        console.error("[inquiries] summary failed:", err);
      }
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const unsubscribe = subscribeNewInquiry(() => {
      void loadList();
      void loadSummary();
    });
    return unsubscribe;
  }, [loadList, loadSummary]);

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const selectFilter = (next: Filter) => {
    if (next === filter) return;
    setFilter(next);
    setPage(1);
  };

  const setStatus = async (id: string, status: InquiryStatus) => {
    setBusyId(id);
    try {
      await updateInquiryStatus(id, status);
      await Promise.all([loadList(), loadSummary()]);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        console.error("[inquiries] status update failed:", err);
      }
    } finally {
      setBusyId(null);
    }
  };

  const removeInquiry = async () => {
    if (!deleteId) return;
    setBusyId(deleteId);
    try {
      await deleteInquiry(deleteId);
      setDeleteId(null);
      await Promise.all([loadList(), loadSummary()]);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) {
        console.error("[inquiries] delete failed:", err);
      }
    } finally {
      setBusyId(null);
    }
  };

  const tabCount = (key: Filter): number =>
    key === "all"
      ? summary.total
      : key === "new"
        ? summary.totalNew
        : key === "replied"
          ? summary.totalReplied
          : summary.totalArchived;

  return (
    <AdminPage
      title="Inquiries"
      description="Messages submitted through the Purely contact form."
    >
      <div className="border-b border-[#E2E8F0] p-4 sm:px-6 dark:border-[#1E293B]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectFilter(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#2FB9BF] text-white shadow-[0_6px_18px_rgba(47,185,191,0.3)]"
                      : "bg-[#F8FAFC] text-[#475569] ring-1 ring-[#E2E8F0] hover:text-[#0F172A] dark:bg-[#1E293B] dark:text-[#94A3B8] dark:ring-[#334155] dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[#E6F7F8] text-[#0E7A80] dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                    }`}
                  >
                    {tabCount(tab.key)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                placeholder="Search name, email or message..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:placeholder-[#64748B] dark:focus:bg-[#0F172A]"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#0F172A] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                void loadList();
                void loadSummary();
              }}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#0F172A] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">
            {error}
          </p>
        </div>
      ) : loading && inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            Loading inquiries…
          </p>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Inbox className="h-12 w-12 text-[#CBD5E1]" />
          <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">
            No inquiries found
          </h2>
          <p className="mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
            Messages submitted through the contact form will appear here in
            real time.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
          {inquiries.map((inquiry) => {
            const busy = busyId === inquiry.id;
            return (
              <div
                key={inquiry.id}
                className="flex gap-4 px-4 py-4 sm:px-6"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F7F8] text-sm font-bold text-[#0E7A80] dark:bg-[#163A3B] dark:text-[#5EEAD4]">
                  {initialsOf(inquiry.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="truncate text-sm font-bold text-[#0F172A] dark:text-white">
                      {inquiry.name}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${STATUS_BADGE[inquiry.status]}`}
                    >
                      {STATUS_LABELS[inquiry.status]}
                    </span>
                    <span className="text-xs text-[#94A3B8]">
                      {formatDate(inquiry.createdAt)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#475569] dark:text-[#94A3B8]">
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="break-all font-medium text-[#2FB9BF] transition-colors hover:text-[#0E7A80]"
                    >
                      {inquiry.email}
                    </a>
                    {inquiry.phone && <span>{inquiry.phone}</span>}
                  </div>

                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#0F172A] dark:text-[#E2E8F0]">
                    {inquiry.message}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {inquiry.status !== "replied" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setStatus(inquiry.id, "replied")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs font-semibold text-[#16A34A] transition-colors hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
                      title="Mark as replied"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Replied
                    </button>
                  )}
                  {inquiry.status !== "archived" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setStatus(inquiry.id, "archived")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs font-semibold text-[#475569] transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-slate-500/40 dark:hover:bg-slate-500/10"
                      title="Archive"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setDeleteId(inquiry.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs font-semibold text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:hover:border-red-500/40 dark:hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && inquiries.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-[#E2E8F0] px-4 py-3 sm:px-6 dark:border-[#1E293B]">
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
            {total} inquiry{total !== 1 && "s"} · Page {page} of{" "}
            {Math.max(totalPages, 1)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex h-9 items-center rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="inline-flex h-9 items-center rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                    Delete inquiry
                  </h2>
                  <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                    This inquiry will be permanently removed. This cannot be
                    undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 dark:border-[#1E293B] dark:bg-[#0B131B]">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={busyId === deleteId}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeInquiry()}
                disabled={busyId === deleteId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {busyId === deleteId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}