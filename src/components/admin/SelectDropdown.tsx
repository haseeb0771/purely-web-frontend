"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";

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
  renderOption,
  searchable = false,
  searchPlaceholder = "Search…",
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
  renderOption?: (option: SelectOption, isSelected: boolean) => ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions =
    searchable && normalizedQuery
      ? options.filter((o) => o.label.toLowerCase().includes(normalizedQuery))
      : options;

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
        onClick={() =>
          setOpen((v) => {
            if (!v) setQuery("");
            return !v;
          })
        }
        className="flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white focus:ring-2 focus:ring-[#2FB9BF]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:focus:bg-[#0F172A]"
      >
        <span className={selected ? "text-[#0F172A] dark:text-white" : "text-[#94A3B8]"}>
          {selected
            ? renderOption
              ? renderOption(selected, true)
              : selected.label
            : placeholder}
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
          {searchable && (
            <div className="sticky top-0 z-10 border-b border-[#F1F5F9] bg-white px-2.5 py-2 dark:border-[#1E293B] dark:bg-[#0F172A]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-1.5 pl-8 pr-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#2FB9BF] focus:bg-white dark:border-[#334155] dark:bg-[#0F172A] dark:text-white dark:focus:bg-[#0F172A]"
                />
              </div>
            </div>
          )}

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

          {visibleOptions.length === 0 && (
            <p className="px-3.5 py-2.5 text-sm text-[#94A3B8]">
              {normalizedQuery ? "No matches found." : "No options available."}
            </p>
          )}

          {visibleOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  setQuery("");
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-[#F0FDFB] font-semibold text-[#0E7A80] dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                    : "text-[#334155] hover:bg-[#F8FAFC] dark:text-[#CBD5E1] dark:hover:bg-[#1E293B]"
                }`}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  {renderOption ? (
                    renderOption(option, isSelected)
                  ) : (
                    <span>{option.label}</span>
                  )}
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-[#2FB9BF]" />}
                </span>
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
