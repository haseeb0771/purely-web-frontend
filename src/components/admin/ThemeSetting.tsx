"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export default function ThemeSetting() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-5 transition-all duration-200 hover:border-[#2FB9BF]/50">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#0F172A] ring-1 ring-[#2FB9BF]/30">
        <Monitor className="h-5 w-5 text-[#2FB9BF]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
          Appearance
        </h2>
        <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Choose between light and dark theme for the panel.
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={dark}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggle}
          className="mt-4 flex w-full items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 text-left transition-colors hover:border-[#2FB9BF]/50 dark:border-[#334155] dark:bg-[#0F172A]"
        >
          <span className="flex items-center gap-3">
            {dark ? (
              <Moon className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
            ) : (
              <Sun className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
            )}
            <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
              {dark ? "Dark theme active" : "Light theme active"}
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              dark ? "bg-[#2FB9BF]" : "bg-[#CBD5E1]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                dark ? "translate-x-[1.375rem]" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );
}