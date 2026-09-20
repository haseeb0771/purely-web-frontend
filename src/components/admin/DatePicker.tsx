"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAnchoredPopup } from "./useAnchoredPopup";

export interface DatePreset {
  label: string;
  days: number;
}

export const DEFAULT_DATE_PRESETS: DatePreset[] = [
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toInputDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(value: string): string {
  if (!value) return "";
  const date = parseDate(value);
  if (!date) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  label = "Select date",
  presets = DEFAULT_DATE_PRESETS,
  className = "",
  allowPast = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  presets?: DatePreset[];
  className?: string;
  allowPast?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = parseDate(value) ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const { position, update } = useAnchoredPopup(containerRef, 336, 420);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const base = parseDate(value) ?? new Date();
    setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    update();
    const handleReposition = () => update();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, update]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selected = parseDate(value);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOffset = (viewMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0 || cells.length < 35) cells.push(null);

  const moveMonth = (delta: number) => {
    setViewMonth(new Date(year, month + delta, 1));
  };

  const pickDate = (date: Date) => {
    onChange(toInputDate(date));
    setOpen(false);
  };

  const pickPreset = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    pickDate(date);
  };

  const clearDate = () => {
    onChange("");
    setOpen(false);
  };

  const isPast = (date: Date) => date.getTime() < today.getTime();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-left text-sm outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20"
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays
            className={`h-4 w-4 shrink-0 ${
              value ? "text-[#2FB9BF]" : "text-[#94A3B8]"
            }`}
          />
          <span
            className={`truncate ${
              value
                ? "font-medium text-[#0F172A] dark:text-white"
                : "text-[#94A3B8]"
            }`}
          >
            {value ? formatDisplay(value) : placeholder}
          </span>
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open &&
        mounted &&
        position &&
        createPortal(
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              ...(position.bottom !== undefined
                ? { bottom: position.bottom }
                : { top: position.top }),
            }}
            className="z-[70] overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_16px_48px_rgba(15,23,42,0.14)] dark:border-[#1E293B] dark:bg-[#0F172A] dark:shadow-none"
          >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-[#0F172A] dark:text-white">
              {label}
            </p>
            {value && (
              <button
                type="button"
                onClick={clearDate}
                title="Clear date"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E2E8F0] text-[#475569] hover:bg-red-100 hover:text-red-600 dark:bg-[#1E293B] dark:text-[#94A3B8] dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:text-[#94A3B8]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-[#0F172A] dark:text-white">
              {MONTHS[month]} {year}
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="Next month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#475569] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:text-[#94A3B8]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]"
              >
                {day}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell) return <div key={`empty-${i}`} />;
              const dayNum = cell.getDate();
              const isSelectedDate = selected ? isSameDay(cell, selected) : false;
              const isToday = isSameDay(cell, today);
              const disabled = !allowPast && isPast(cell) && !isSelectedDate;

              let cellClass =
                "flex h-9 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors ";
              if (disabled) {
                cellClass += "cursor-not-allowed text-[#CBD5E1] dark:text-[#334155]";
              } else if (isSelectedDate) {
                cellClass += "bg-[#2FB9BF] text-white shadow-[0_4px_12px_rgba(47,185,191,0.4)]";
              } else {
                cellClass +=
                  "text-[#0F172A] hover:bg-[#2FB9BF]/10 hover:text-[#2FB9BF] dark:text-white dark:hover:bg-[#2FB9BF]/15";
              }
              if (isToday && !isSelectedDate) {
                cellClass += " ring-1 ring-[#2FB9BF]";
              }

              return (
                <button
                  key={cell.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDate(cell)}
                  className={cellClass}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {presets.length > 0 && (
            <div className="mt-3 border-t border-[#E2E8F0] pt-3 dark:border-[#1E293B]">
              <p className="mb-1.5 text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
                Quick options
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => pickPreset(preset.days)}
                    className="rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:text-[#94A3B8]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => pickDate(today)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E2E8F0] px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:text-[#94A3B8]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={clearDate}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E2E8F0] px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-red-400/60 hover:text-red-600 dark:border-[#334155] dark:text-[#94A3B8]"
            >
              Clear
            </button>
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}