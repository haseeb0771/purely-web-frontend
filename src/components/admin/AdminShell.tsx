"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, Loader2 } from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { ToastProvider } from "./toast";
import { ApiError, fetchAdminMe, logoutAdmin } from "@/lib/admin-api";
import type { SanitizedAdmin } from "@/lib/admin-api";
import { disconnectAdminSocket } from "@/lib/admin-socket";

const SIDEBAR_STORAGE_KEY = "purely-admin-sidebar-collapsed";

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AdminShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [admin, setAdmin] = useState<SanitizedAdmin | null>(null);
  const [verified, setVerified] = useState(false);
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await fetchAdminMe();
        if (cancelled) return;
        setAdmin(me);
        setVerified(true);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/admin");
          return;
        }
        router.replace("/admin");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // storage unavailable — ignore
    }
  }, [collapsed]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutAdmin();
    } finally {
      disconnectAdminSocket();
      router.replace("/admin");
      router.refresh();
    }
  }

  if (!verified) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#F8FAFC] dark:bg-[#0B131B]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2FB9BF]/10 ring-1 ring-[#2FB9BF]/30">
          <Droplets className="h-7 w-7 text-[#2FB9BF]" />
        </div>
        <div className="flex items-center gap-3 text-[#475569] dark:text-[#94A3B8]">
          <Loader2 className="h-5 w-5 animate-spin text-[#2FB9BF]" />
          <span className="text-sm font-medium">Verifying secure session…</span>
        </div>
      </main>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden bg-[#F8FAFC] dark:bg-[#0B131B]">
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar
            admin={admin}
            onOpenMobile={() => setMobileOpen(true)}
            onLogout={() => void handleLogout()}
            loggingOut={loggingOut}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}