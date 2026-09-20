"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Clock, X } from "lucide-react";
import { useAnchoredPopup } from "./useAnchoredPopup";

export interface TimePreset {
  label: string;
  value: string;
}

export const DEFAULT_TIME_PRESETS: TimePreset[] = [
  { label: "9:00 AM", value: "09:00" },
  { label: "12:00 PM", value: "12:00" },
  { label: "3:00 PM", value: "15:00" },
  { label: "6:00 PM", value: "18:00" },
];

const POPUP_WIDTH = 256;
const ESTIMATED_HEIGHT = 400;
const MINUTE_LIST_HEIGHT = 160;

const pad = (n: number) => String(n).padStart(2, "0");

function parseTime(value: string): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function periodOf(hour: number): "AM" | "PM" {
  return hour >= 12 ? "PM" : "AM";
}

function formatDisplay(value: string): string {
  const parsed = parseTime(value);
  if (!parsed) return "";
  const h12 = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return `${h12}:${pad(parsed.minute)} ${periodOf(parsed.hour)}`;
}

function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${periodOf(hour)}`;
}

export default function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  label = "Select time",
  presets = DEFAULT_TIME_PRESETS,
  minuteStep = 5,
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  presets?: TimePreset[];
  minuteStep?: number;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const parsed = parseTime(value);
  const { position, update } = useAnchoredPopup(
    containerRef,
    POPUP_WIDTH,
    ESTIMATED_HEIGHT
  );

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const step = Math.max(1, Math.min(60, minuteStep));
  const minutes: number[] = [];
  for (let m = 0; m < 60; m += step) minutes.push(m);

  const setHour = (hour: number) => {
    onChange(`${pad(hour)}:${pad(parsed?.minute ?? 0)}`);
  };

  const setMinute = (minute: number) => {
    onChange(`${pad(parsed?.hour ?? 9)}:${pad(minute)}`);
  };

  const clearTime = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#0F172A] px-3.5 py-2.5 text-left text-sm outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:focus:bg-[#1a2332] focus:ring-2 focus:ring-[#2FB9BF]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Clock
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
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${
            open ? "rotate-180" : ""
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
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[#0F172A] dark:text-white">
                {label}
              </p>
              {value && (
                <button
                  type="button"
                  onClick={clearTime}
                  title="Clear time"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E2E8F0] text-[#475569] hover:bg-red-100 hover:text-red-600 dark:bg-[#1E293B] dark:text-[#94A3B8] dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {presets.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      onChange(preset.value);
                      setOpen(false);
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                      value === preset.value
                        ? "border-[#2FB9BF] bg-[#2FB9BF]/10 text-[#0E7A80] dark:text-[#5EEAD4]"
                        : "border-[#E2E8F0] text-[#475569] hover:border-[#2FB9BF] hover:text-[#2FB9BF] dark:border-[#334155] dark:text-[#94A3B8]"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 border-t border-[#E2E8F0] pt-3 dark:border-[#1E293B]">
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Hour
                  </p>
                  <div
                    style={{ maxHeight: MINUTE_LIST_HEIGHT }}
                    className="space-y-1 overflow-y-auto pr-1"
                  >
                    {hours.map((hour) => {
                      const active = parsed?.hour === hour;
                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => setHour(hour)}
                          className={`w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold transition-colors ${
                            active
                              ? "bg-[#2FB9BF] text-white shadow-[0_4px_12px_rgba(47,185,191,0.4)]"
                              : "text-[#0F172A] hover:bg-[#2FB9BF]/10 hover:text-[#2FB9BF] dark:text-white dark:hover:bg-[#2FB9BF]/15"
                          }`}
                        >
                          {hourLabel(hour)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Minute
                  </p>
                  <div
                    style={{ maxHeight: MINUTE_LIST_HEIGHT }}
                    className="space-y-1 overflow-y-auto pr-1"
                  >
                    {minutes.map((minute) => {
                      const active = parsed?.minute === minute;
                      return (
                        <button
                          key={minute}
                          type="button"
                          onClick={() => setMinute(minute)}
                          className={`w-full rounded-lg px-2 py-1.5 text-left text-sm font-semibold transition-colors ${
                            active
                              ? "bg-[#2FB9BF] text-white shadow-[0_4px_12px_rgba(47,185,191,0.4)]"
                              : "text-[#0F172A] hover:bg-[#2FB9BF]/10 hover:text-[#2FB9BF] dark:text-white dark:hover:bg-[#2FB9BF]/15"
                          }`}
                        >
                          {pad(minute)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  onChange(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
                }}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E2E8F0] px-3 text-sm font-semibold text-[#475569] transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:text-[#94A3B8]"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#2FB9BF] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#28A7AC]"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
