"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string;
}

export default function SelectDropdown({
  value,
  options,
  placeholder = "Select an option",
  onSelect,
  actionLabel,
  onAction,
  onReachEnd,
  loadingMore = false,
  disabled = false,
}: {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onSelect: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  onReachEnd?: () => void;
  loadingMore?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white focus:ring-2 focus:ring-[#2FB9BF]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:focus:bg-[#0F172A]"
      >
        <span className={selected ? "text-[#0F172A] dark:text-white" : "text-[#94A3B8]"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg dark:border-[#1E293B] dark:bg-[#0F172A]"
          onScroll={(event) => {
            if (!onReachEnd) return;
            const el = event.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) {
              onReachEnd();
            }
          }}
        >
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={() => {
                onAction();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-semibold text-[#2FB9BF] hover:bg-[#F0FDFB] dark:hover:bg-[#163A3B]"
            >
              <Plus className="h-4 w-4" />
              {actionLabel}
            </button>
          )}

          {options.length === 0 && (
            <p className="px-3.5 py-2.5 text-sm text-[#94A3B8]">
              No options available.
            </p>
          )}

          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-[#F0FDFB] font-semibold text-[#0E7A80] dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                    : "text-[#334155] hover:bg-[#F8FAFC] dark:text-[#CBD5E1] dark:hover:bg-[#1E293B]"
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="h-4 w-4 text-[#2FB9BF]" />}
              </button>
            );
          })}

          {loadingMore && (
            <p className="px-3.5 py-2 text-center text-xs text-[#94A3B8]">
              Loading more…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
