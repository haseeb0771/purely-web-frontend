"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarRange, ChevronDown, X, Clock } from "lucide-react";

export interface DateRange {
  from: string;
  to: string;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:ring-2 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white";

export default function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  useEffect(() => {
    setDraftFrom(from);
    setDraftTo(to);
  }, [from, to, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyPreset = (days: number) => {
    const now = new Date();
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    onChange({ from: toLocalInputValue(fromDate), to: toLocalInputValue(now) });
    setOpen(false);
  };

  const applyCustom = () => {
    onChange({ from: draftFrom, to: draftTo });
    setOpen(false);
  };

  const clearRange = () => {
    onChange({ from: "", to: "" });
    setOpen(false);
  };

  const hasRange = from !== "" || to !== "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-medium text-[#0F172A] transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white"
      >
        <CalendarRange className="h-4 w-4 text-[#2FB9BF]" />
        <span>
          {hasRange
            ? `${from || "Start"} → ${to || "End"}`
            : "Date range"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#94A3B8] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {hasRange && (
        <button
          type="button"
          onClick={clearRange}
          title="Clear date range"
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E2E8F0] text-[#475569] hover:bg-red-100 hover:text-red-600 dark:bg-[#1E293B] dark:text-[#94A3B8] dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.14)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none">
          <p className="mb-3 text-sm font-bold text-[#0F172A] dark:text-white">
            Date range
          </p>

          <div className="mb-4 grid grid-cols-3 gap-1.5">
            {[
              { label: "Today", days: 1 },
              { label: "7 days", days: 7 },
              { label: "30 days", days: 30 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.days)}
                className="rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:text-[#94A3B8]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                <Clock className="h-3.5 w-3.5" /> From
              </span>
              <input
                type="datetime-local"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                <Clock className="h-3.5 w-3.5" /> To
              </span>
              <input
                type="datetime-local"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={applyCustom}
              className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[#2FB9BF] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#0BAEC4]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={clearRange}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E2E8F0] px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:text-[#94A3B8]"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
