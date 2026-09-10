import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F7F8] ring-1 ring-[#2FB9BF]/30 dark:bg-[#163A3B]">
        <Icon className="h-7 w-7 text-[#2FB9BF]" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">{hint}</p>
    </div>
  );
}