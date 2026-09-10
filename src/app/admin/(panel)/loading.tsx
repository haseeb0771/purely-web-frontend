import { Loader2 } from "lucide-react";

export default function AdminPanelLoading() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <span className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2FB9BF]/30" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#E6F7F8] dark:bg-[#163A3B]">
          <Loader2 className="h-6 w-6 animate-spin text-[#2FB9BF]" />
        </span>
      </span>
      <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">Loading…</p>
      <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">Please wait a moment.</p>
    </div>
  );
}
