import { ShieldCheck } from "lucide-react";
import AdminPage from "@/components/admin/AdminPage";
import BudgetSettings from "@/components/admin/BudgetSettings";
import ProfileSettings from "@/components/admin/ProfileSettings";
import PasswordSettings from "@/components/admin/PasswordSettings";
import ThemeSetting from "@/components/admin/ThemeSetting";

export default function SettingsPage() {
  return (
    <AdminPage
      title="Settings & Admin Profile"
      description="Manage your account, security, budget and panel preferences."
    >
      <div className="space-y-4 p-6">
        <ProfileSettings />
        <PasswordSettings />
        <BudgetSettings />
        <ThemeSetting />
        <div className="flex items-start gap-4 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#1E293B] p-5 transition-all duration-200 hover:border-[#2FB9BF]/50">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#0F172A] ring-1 ring-[#2FB9BF]/30">
            <ShieldCheck className="h-5 w-5 text-[#2FB9BF]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-white">
              Access control
            </h2>
            <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
              Role-based access and rate-limited login endpoints.
            </p>
            <p className="mt-1.5 text-xs font-medium text-[#16A34A] dark:text-emerald-400">
              Activity monitored
            </p>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}