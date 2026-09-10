"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Inbox,
  Loader2,
  LogOut,
  Menu,
  Radio,
  X,
} from "lucide-react";
import {
  connectAdminSocket,
  disconnectAdminSocket,
  subscribeAdminActivity,
  subscribeInventoryNotification,
  subscribeNewInquiry,
} from "@/lib/admin-socket";
import {
  ApiError,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationsRead,
  type AdminNotification,
  type SanitizedAdmin,
} from "@/lib/admin-api";

interface NotificationItem {
  id: string;
  title: string;
  hint: string;
  href?: string;
  receivedAt: string;
}

interface AdminTopbarProps {
  admin: SanitizedAdmin | null;
  onOpenMobile: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

function notificationFromPayload(payload: unknown): Pick<
  NotificationItem,
  "title" | "hint" | "href"
> {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const name =
      typeof record.name === "string" ? record.name : undefined;
    const email =
      typeof record.email === "string" ? record.email : undefined;
    const href =
      typeof record.href === "string" ? record.href : undefined;
    if (name || email) {
      return {
        title: "New inquiry received",
        hint: [name, email].filter(Boolean).join(" · ") || "Purely contact form",
        href,
      };
    }
  }
  return {
    title: "New inquiry received",
    hint: "Purely contact form",
  };
}

function activityNotificationFromPayload(payload: unknown): Pick<
  NotificationItem,
  "title" | "hint" | "href"
> {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message =
      typeof record.message === "string" ? record.message : undefined;
    if (message) {
      return {
        title: "Admin activity",
        hint: message,
        href: "/admin/activity-logs",
      };
    }
  }
  return {
    title: "Admin activity",
    hint: "Another admin made a change.",
    href: "/admin/activity-logs",
  };
}

function inventoryNotificationFromPayload(payload: unknown): Pick<
  NotificationItem,
  "title" | "hint" | "href"
> {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type : "UPDATE";
    const message =
      typeof record.message === "string" ? record.message : undefined;
    const moduleName =
      typeof record.module === "string" ? record.module : undefined;
    const itemId =
      typeof record.itemId === "string" ? record.itemId : undefined;
    const href =
      moduleName && itemId
        ? `/admin/inventory/${moduleName}?open=${itemId}`
        : moduleName
        ? `/admin/inventory/${moduleName}`
        : undefined;
    return {
      title: `Inventory ${type.charAt(0) + type.slice(1).toLowerCase()}`,
      hint: message ?? "An inventory item changed.",
      href,
    };
  }
  return {
    title: "Inventory Update",
    hint: "An inventory item changed.",
  };
}

function notificationItemFromApi(n: AdminNotification): NotificationItem {
  return {
    id: n.id,
    title: n.title,
    hint: n.message,
    href: n.href || undefined,
    receivedAt: n.createdAt,
  };
}

function formatRelativeTime(iso: string): string {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminTopbar({
  admin,
  onOpenMobile,
  onLogout,
  loggingOut,
}: AdminTopbarProps) {
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotificationItem | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const router = useRouter();

  const navigateTo = (href?: string) => {
    if (!href) return;
    setToast(null);
    setOpen(false);
    router.push(href);
  };

  useEffect(() => {
    let initialLoadCancelled = false;
    void (async () => {
      try {
        const result = await fetchNotifications({ page: 1, pageSize: 20 });
        if (initialLoadCancelled) return;
        const items = result.data.map(notificationItemFromApi);
        setNotifications((current) => {
          const existingIds = new Set(current.map((n) => n.id));
          const merged = [...items.filter((n) => !existingIds.has(n.id)), ...current];
          return merged.slice(0, 20);
        });
        setUnread(result.totalUnread);
      } catch (err) {
        if (err instanceof ApiError && err.status !== 401) {
          console.error("[notifications] failed to load:", err);
        }
      }
    })();

    const activeSocket = connectAdminSocket();

    const handleConnect = (): void => setConnected(true);
    const handleDisconnect = (): void => setConnected(false);
    const handleConnectError = (): void => setConnected(false);

    activeSocket.on("connect", handleConnect);
    activeSocket.on("disconnect", handleDisconnect);
    activeSocket.on("connect_error", handleConnectError);

    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    const pushNotification = (title: string, hint: string, href?: string) => {
      const item: NotificationItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        hint,
        href,
        receivedAt: new Date().toISOString(),
      };
      setNotifications((current) => [item, ...current].slice(0, 20));
      setUnread((count) => count + 1);
      setToast(item);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToast(null), 6000);
    };

    const unsubscribeInquiry = subscribeNewInquiry((payload) => {
      const next = notificationFromPayload(payload);
      pushNotification(next.title, next.hint, next.href);
    });

    const unsubscribeActivity = subscribeAdminActivity((payload) => {
      const next = activityNotificationFromPayload(payload);
      pushNotification(next.title, next.hint, next.href);
    });

    const unsubscribeInventory = subscribeInventoryNotification((payload) => {
      const next = inventoryNotificationFromPayload(payload);
      pushNotification(next.title, next.hint, next.href);
    });

    return () => {
      initialLoadCancelled = true;
      activeSocket.off("connect", handleConnect);
      activeSocket.off("disconnect", handleDisconnect);
      activeSocket.off("connect_error", handleConnectError);
      unsubscribeInquiry();
      unsubscribeActivity();
      unsubscribeInventory();
      if (toastTimer) clearTimeout(toastTimer);
      disconnectAdminSocket();
    };
  }, []);

  function toggleBell() {
    setOpen((value) => !value);
    setUnread(0);
  }

  function markAllRead() {
    setUnread(0);
    void markNotificationsRead([]).catch((err) => {
      if (err instanceof ApiError && err.status !== 401) {
        console.error("[notifications] mark-read failed:", err);
      }
    });
  }

  const showUnreadBadge = unread > 0;
  const initials = admin
    ? admin.name
        .split(" ")
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

return (
    <>
      {toast && (
        <div
          className={`fixed right-4 top-20 z-50 w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.16)] dark:border-[#334155] dark:bg-[#0F172A]${toast.href ? " cursor-pointer" : ""}`}
          onClick={toast.href ? () => navigateTo(toast.href) : undefined}
        >
          <div className="flex gap-3 p-4">
            <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F59E0B] opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                {toast.title}
              </p>
              <p className="mt-0.5 text-sm font-medium leading-snug text-[#0F172A] dark:text-white">
                {toast.hint}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToast(null)}
              className="ml-auto shrink-0 text-[#94A3B8] transition-colors hover:text-[#0F172A] dark:hover:text-[#E2E8F0]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-1 w-full origin-left bg-[#2FB9BF]/30">
            <div
              className="h-full animate-[toast-shrink_6s_linear_forwards] bg-[#2FB9BF]"
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}
      <header
        className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white/85 px-4 backdrop-blur-xl sm:px-6 dark:border-[#1E293B] dark:bg-[#0B131B]/85"
      >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#475569] transition-colors hover:border-[#2FB9BF]/50 hover:text-[#0F172A] dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#E2E8F0] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="hidden text-sm font-semibold tracking-wide text-[#475569] dark:text-[#94A3B8] md:inline">
          Admin Panel
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={toggleBell}
            aria-label="Notifications"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#475569] transition-all duration-200 hover:border-[#2FB9BF]/50 hover:text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2FB9BF]/20 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#E2E8F0]"
          >
            <Bell className="h-5 w-5" />
            {connected && (
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
              </span>
            )}
            {showUnreadBadge && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-[320px] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.14)] dark:border-[#1E293B] dark:bg-[#0F172A]">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 dark:border-[#1E293B]">
                <span className="text-sm font-bold text-[#0F172A] dark:text-white">
                  Notifications
                </span>
                <div className="flex items-center gap-2">
                  {connected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A]">
                      <Radio className="h-3 w-3" />
                      Live
                    </span>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-[11px] font-semibold text-[#2FB9BF] transition-colors hover:text-[#0E7A80] dark:text-[#5EEAD4] dark:hover:text-[#2FB9BF]"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                    <Inbox className="h-8 w-8 text-[#CBD5E1]" />
                    <p className="text-sm font-medium text-[#475569] dark:text-[#94A3B8]">
                      No notifications yet
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      New inquiries will appear here in real time.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
                    {notifications.map((notification) => (
                      <li
                        key={notification.id}
                        className={`flex gap-3 px-4 py-3${notification.href ? " cursor-pointer transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]" : ""}`}
                        onClick={notification.href ? () => navigateTo(notification.href) : undefined}
                      >
                        <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2FB9BF] opacity-40" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2FB9BF]" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#0F172A] dark:text-white">
                            {notification.title}
                          </p>
                          <p className="truncate text-xs text-[#64748B] dark:text-[#94A3B8]">
                            {notification.hint}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#94A3B8]">
                            {formatRelativeTime(notification.receivedAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

            <Link
              href="/admin/settings"
              className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white py-1.5 pl-1.5 pr-2 transition-all duration-200 hover:border-[#2FB9BF]/50 focus:outline-none focus:ring-4 focus:ring-[#2FB9BF]/20 sm:pr-3 dark:border-[#334155] dark:bg-[#0F172A]"
            >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2FB9BF] text-xs font-bold text-white">
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight text-[#0F172A] dark:text-white">
              {admin?.name ?? "Admin"}
            </span>
            <span className="block text-[11px] leading-tight text-[#94A3B8]">
              Administrator
            </span>
          </span>
          <ChevronRight className="hidden h-4 w-4 text-[#CBD5E1] transition-colors group-hover:text-[#2FB9BF] sm:block" />
        </Link>

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          disabled={loggingOut}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#475569] transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:focus:ring-red-500/20 sm:px-4"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
      </header>

      {confirmLogout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl dark:border-[#1E293B] dark:bg-[#0F172A]">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
                  <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                    Confirm logout
                  </h2>
                  <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                    Are you sure you want to log out of the admin panel?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 dark:border-[#1E293B] dark:bg-[#0B131B]">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] disabled:opacity-60 dark:border-[#334155] dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onLogout()}
                disabled={loggingOut}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {loggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}