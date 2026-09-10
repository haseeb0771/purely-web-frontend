"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileClock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FilterX,
  Eye,
  X,
  User,
  Boxes,
  ShieldCheck,
  UserCircle2,
  Activity,
} from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import SelectDropdown from "@/components/admin/SelectDropdown";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import {
  ApiError,
  fetchAuditLogs,
  type AuditLogEntry,
} from "@/lib/admin-api";

const ACTION_STYLES: Record<AuditLogEntry["action"], string> = {
  CREATE:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30",
  UPDATE:
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30",
  DELETE:
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30",
};

const ACTION_OPTIONS = [
  { label: "All actions", value: "" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Delete", value: "DELETE" },
];

const MODULE_OPTIONS = [
  { label: "All modules", value: "" },
  { label: "Bottles", value: "bottles" },
  { label: "Caps", value: "caps" },
  { label: "Labels", value: "labels" },
  { label: "Pet Packaging", value: "pet-packaging" },
  { label: "Expenses", value: "expense" },
  { label: "Expense Names", value: "expense-category" },
  { label: "Budget", value: "budget" },
  { label: "Admin Profile", value: "admin-profile" },
  { label: "Password", value: "admin-password" },
];

const FRIENDLY_KEYS: Record<string, string> = {
  size: "Size",
  quantity: "Qty",
  qty: "Qty",
  totalCostPrice: "Total Cost",
  unitCostPrice: "Unit Cost",
  color: "Color",
  name: "Name",
  type: "Type",
  imageUrl: "Image",
  serialNo: "Serial No",
  status: "Status",
};

function friendlyKey(key: string): string {
  return FRIENDLY_KEYS[key] ?? key;
}

function formatLabel(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return String(value);
}

function renderObjectInline(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([k, v]) => {
      const val =
        v === null || v === undefined
          ? "—"
          : typeof v === "object"
            ? renderObjectInline(v as Record<string, unknown>)
            : formatLabel(v);
      return `${friendlyKey(k)}: ${val}`;
    })
    .join(" · ");
}

function capitalizeLabel(label: string): string {
  return label
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractSizes(changes: { field: string; newValue: unknown }[]): string[] | null {
  const sizes: string[] = [];
  for (const change of changes) {
    if (Array.isArray(change.newValue)) {
      for (const item of change.newValue) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const size = (item as Record<string, unknown>).size;
          if (size !== undefined) sizes.push(String(size));
        }
      }
    }
  }
  return sizes.length > 0 ? sizes : null;
}

function summarizeLog(log: AuditLogEntry): { title: string; detail?: string } {
  const moduleLabel = capitalizeLabel(log.targetModule.replace(/-/g, " "));
  const itemName = log.itemLabel ?? `item`;

  if (log.action === "CREATE") {
    return {
      title: `Created ${itemName}`,
      detail: `New ${moduleLabel} entry added`,
    };
  }

  if (log.action === "DELETE") {
    return {
      title: `Deleted ${itemName}`,
      detail: `${moduleLabel} item removed`,
    };
  }

  const names = log.changes.map((change) => friendlyKey(change.field));
  const title =
    names.length > 0 ? `Updated ${names.join(", ")}` : `Updated ${moduleLabel}`;

  const sizes = extractSizes(log.changes);
  if (sizes) {
    return { title, detail: `Sizes: ${sizes.join(", ")}` };
  }
  if (log.changes.length > 0) {
    return {
      title,
      detail: `${log.changes.length} field${log.changes.length > 1 ? "s" : ""} changed`,
    };
  }
  return { title };
}

function FormatValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-[#94A3B8]">—</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-[#94A3B8]">—</span>;
    }
    return (
      <ul className="space-y-1">
        {value.map((item, index) => (
          <li key={index}>
            {item !== null && typeof item === "object" && !Array.isArray(item) ? (
              <span className="inline-flex flex-wrap gap-x-1 rounded-md bg-[#F8FAFC] px-1.5 py-0.5 ring-1 ring-[#E2E8F0] dark:bg-[#0B131B] dark:ring-[#334155]">
                {renderObjectInline(item as Record<string, unknown>)}
              </span>
            ) : (
              <span className="inline-block rounded-md bg-[#F8FAFC] px-1.5 py-0.5 ring-1 ring-[#E2E8F0] dark:bg-[#0B131B] dark:ring-[#334155]">
                {formatLabel(item)}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-[#94A3B8]">—</span>;
    }
    return (
      <div className="space-y-0.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-1.5">
            <span className="font-medium text-[#475569] dark:text-[#94A3B8]">
              {friendlyKey(k)}:
            </span>
            <FormatValue value={v} />
          </div>
        ))}
      </div>
    );
  }

  return <span>{formatLabel(value)}</span>;
}

function ChangeRow({ change }: { change: { field: string; oldValue: unknown; newValue: unknown } }) {
  const isComplex =
    Array.isArray(change.oldValue) ||
    Array.isArray(change.newValue) ||
    (change.oldValue !== null && typeof change.oldValue === "object") ||
    (change.newValue !== null && typeof change.newValue === "object");

  if (change.field === "sizeDetails" || isComplex) {
    return (
      <div className="rounded-lg border border-[#E2E8F0] px-2.5 py-2 dark:border-[#334155]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
          {friendlyKey(change.field)}
        </p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Before
            </p>
            <div className="text-xs leading-relaxed text-[#64748B] dark:text-[#CBD5E1]">
              <FormatValue value={change.oldValue} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              After
            </p>
            <div className="text-xs leading-relaxed font-medium text-[#0F172A] dark:text-white">
              <FormatValue value={change.newValue} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="font-bold text-[#334155] dark:text-[#CBD5E1]">
        {friendlyKey(change.field)}:
      </span>
      <span className="text-[#64748B] dark:text-[#94A3B8] line-through decoration-rose-300/70">
        {formatLabel(change.oldValue)}
      </span>
      <span className="font-bold text-[#2FB9BF]">➔</span>
      <span className="font-bold text-[#0F172A] dark:text-white">
        {formatLabel(change.newValue)}
      </span>
    </div>
  );
}

function formatTimestampParts(iso?: string): { date: string; time: string; raw?: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
    raw: iso,
  };
}

function TimestampCell({ iso }: { iso?: string }) {
  const parts = formatTimestampParts(iso);
  if (!parts) {
    return <span className="text-[#94A3B8]">—</span>;
  }
  return (
    <div title={parts.raw} className="whitespace-nowrap">
      <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{parts.date}</p>
      <p className="text-xs font-medium text-[#2FB9BF]">{parts.time}</p>
    </div>
  );
}

function DetailCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof User;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-[#334155] dark:bg-[#0B131B]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2FB9BF]/10">
        <Icon className="h-5 w-5 text-[#2FB9BF]" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#94A3B8]">
          {label}
        </p>
        <p className="truncate text-sm font-bold text-[#0F172A] dark:text-white" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function LogDetailsModal({
  log,
  onClose,
}: {
  log: AuditLogEntry;
  onClose: () => void;
}) {
  const parts = formatTimestampParts(log.timestamp);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl dark:border-[#1E293B] dark:bg-[#0F172A]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-5 py-4 dark:border-[#1E293B]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2FB9BF]/10">
              <FileClock className="h-5 w-5 text-[#2FB9BF]" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                Activity details
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {log.targetModule.replace(/-/g, " ")} · {parts ? parts.date : "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:hover:bg-[#1E293B] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailCard label="Admin" value={log.adminName} icon={UserCircle2} />
            <DetailCard
              label="Action"
              value={log.action}
              icon={Activity}
            />
            <DetailCard
              label="Module"
              value={log.targetModule.replace(/-/g, " ")}
              icon={Boxes}
            />
            <DetailCard
              label="Item"
              value={log.itemLabel ?? `#${log.itemId}`}
              icon={ShieldCheck}
            />
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-[#334155] dark:bg-[#0B131B]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2FB9BF]/10">
              <FileClock className="h-5 w-5 text-[#2FB9BF]" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B] dark:text-[#94A3B8]">
                Recorded on
              </p>
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                {parts ? `${parts.date} · ${parts.time}` : "—"}
              </p>
            </div>
          </div>

          <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
            Changes
          </p>
          {log.changes.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">No field changes recorded.</p>
          ) : (
            <div className="space-y-2">
              {log.changes.map((change, index) => (
                <ChangeRow key={index} change={change} />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E2E8F0] px-5 py-3 dark:border-[#1E293B]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const hasActiveFilters = action !== "" || module !== "" || from !== "" || to !== "";

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAuditLogs({
          page: targetPage,
          pageSize: 20,
          action: action || undefined,
          module: module || undefined,
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(to).toISOString() : undefined,
        });
        setLogs(
          result.data.sort((a, b) => {
            const aTs = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bTs = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return bTs - aTs;
          })
        );
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages || 1);
        setPage(targetPage);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to load activity logs.");
        }
        setLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [action, module, from, to]
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  function handleApply() {
    void load(1);
  }

  function handleReset() {
    setAction("");
    setModule("");
    setFrom("");
    setTo("");
    void load(1);
  }

  const summary = useMemo(() => {
    if (logs.length === 0) return null;
    return formatTimestampParts(logs[0].timestamp);
  }, [logs]);

  return (
    <AdminPage
      title="Activity Logs"
      description="A precise audit trail of every change made by admin accounts."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] px-4 py-4 sm:px-6 dark:border-[#1E293B]">
        <div className="flex items-center gap-2">
          <FileClock className="h-4 w-4 text-[#2FB9BF]" />
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
            {total > 0
              ? `${total} recorded ${total === 1 ? "activity" : "activities"}`
              : "No activity yet"}
          </p>
        </div>
        {summary && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2FB9BF]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2FB9BF] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2FB9BF]" />
            </span>
            Newest · {summary.date} · {summary.time}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-[#E2E8F0] px-4 py-4 sm:px-6 dark:border-[#1E293B]">
        <label className="flex min-w-[180px] flex-col gap-1">
          <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Action
          </span>
          <SelectDropdown
            value={action}
            options={ACTION_OPTIONS}
            onSelect={setAction}
          />
        </label>

        <label className="flex min-w-[200px] flex-col gap-1">
          <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Module
          </span>
          <SelectDropdown
            value={module}
            options={MODULE_OPTIONS}
            onSelect={setModule}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Date
          </span>
          <DateRangeFilter from={from} to={to} onChange={(r) => {
            setFrom(r.from);
            setTo(r.to);
          }} />
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

      {error ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <FileClock className="h-10 w-10 text-[#CBD5E1]" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">{error}</p>
        </div>
      ) : loading && logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            Loading activity logs…
          </p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <FileClock className="h-12 w-12 text-[#CBD5E1]" />
          <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">
            {hasActiveFilters ? "No matching activity" : "No activity recorded"}
          </h2>
          <p className="mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
            {hasActiveFilters
              ? "Try adjusting or clearing the filters to see more results."
              : "Changes made by admins across inventory modules will appear here."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
            >
              <RotateCcw className="h-4 w-4" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left bg-white dark:bg-[#0F172A]">
            <thead>
              <tr className="border-b border-[#E2E8F0] dark:border-[#1E293B] text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#E2E8F0]">
                <th className="px-6 py-3">Admin</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Module / Item</th>
                <th className="px-6 py-3">Summary</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="align-top transition-colors dark:hover:bg-[#1E293B] hover:bg-[#F8FAFC]"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F7F8] dark:bg-[#163A3B]">
                        <User className="h-4 w-4 text-[#2FB9BF]" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                          {log.adminName}
                        </p>
                        <p className="text-xs text-[#94A3B8]">#{log.itemId.slice(-6)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${ACTION_STYLES[log.action]}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white capitalize">
                      {log.targetModule.replace(/-/g, " ")}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {log.itemLabel ?? `Item #${log.itemId.slice(-6)}`}
                    </p>
                  </td>
                  <td className="min-w-[260px] px-6 py-4">
                    {(() => {
                      const summary = summarizeLog(log);
                      return (
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                            {summary.title}
                          </p>
                          {summary.detail && (
                            <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                              {summary.detail}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <TimestampCell iso={log.timestamp} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#2FB9BF] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#2FB9BF]"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-[#E2E8F0] px-4 py-4 sm:px-6 dark:border-[#1E293B]">
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void load(page - 1)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 disabled:opacity-40 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void load(page + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 disabled:opacity-40 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {selectedLog && (
        <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </AdminPage>
  );
}
