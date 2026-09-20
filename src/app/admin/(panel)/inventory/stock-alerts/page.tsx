"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  PackageSearch,
} from "lucide-react";
import Link from "next/link";
import AdminPage from "@/components/admin/AdminPage";
import ImageHoverPreview from "@/components/admin/ImageHoverPreview";
import {
  ApiError,
  fetchStockAlerts,
  type StockAlert,
  type StockAlertModule,
} from "@/lib/admin-api";
import {
  subscribeInventoryNotification,
  subscribeStockAlert,
} from "@/lib/admin-socket";

const MODULE_LABELS: Record<StockAlertModule, string> = {
  bottles: "Bottles",
  caps: "Caps",
  labels: "Labels",
  "pet-packaging": "PET Packaging",
};

export default function StockAlertsPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAlerts(await fetchStockAlerts());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load stock alerts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsubInventory = subscribeInventoryNotification(() => {
      void load();
    });
    const unsubStockAlert = subscribeStockAlert(() => {
      void load();
    });
    return () => {
      unsubInventory();
      unsubStockAlert();
    };
  }, [load]);

  return (
    <AdminPage
      title="Stock Alerts"
      description="Inventory items that have fallen below their configured alert level."
    >
      {error ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="mt-4 text-sm font-semibold text-[#0F172A] dark:text-white">
            {error}
          </p>
        </div>
      ) : loading && alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2FB9BF]" />
          <p className="mt-4 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            Loading stock alerts…
          </p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <PackageSearch className="h-12 w-12 text-[#CBD5E1]" />
          <h2 className="mt-4 text-lg font-semibold text-[#0F172A] dark:text-white">
            No stock alerts
          </h2>
          <p className="mt-1 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
            All inventory items are currently above their alert levels.
          </p>
        </div>
      ) : (
        <>
          <p className="border-b border-[#E2E8F0] dark:border-[#1E293B] p-4 sm:px-6 text-sm text-[#64748B] dark:text-[#94A3B8]">
            {alerts.length} item{alerts.length !== 1 && "s"} below alert level
          </p>
          <div className="divide-y divide-[#F1F5F9] dark:divide-[#1E293B]">
            {alerts.map((alert, index) => {
              const shortfall = alert.stockAlertLevel - alert.quantity;
              return (
                <Link
                  key={`${alert.module}-${alert.itemId}-${alert.size ?? ""}-${index}`}
                  href={alert.href}
                  className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] sm:px-6"
                >
                  {alert.imageUrl ? (
                    <ImageHoverPreview
                      src={alert.imageUrl}
                      alt={alert.name}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#1E293B]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={alert.imageUrl}
                        alt={alert.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    </ImageHoverPreview>
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-bold text-[#0E7A80] dark:text-[#5EEAD4]">
                        {alert.customId}
                      </p>
                      <span className="inline-block rounded-md bg-[#E6F7F8] dark:bg-[#163A3B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0E7A80] dark:text-[#5EEAD4]">
                        {MODULE_LABELS[alert.module]}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-[#0F172A] dark:text-white">
                      {alert.name}
                      {alert.size && (
                        <span className="ml-2 inline-block rounded-md bg-[#FEF3C7] dark:bg-[#78350F]/30 px-1.5 py-0.5 text-[10px] font-bold text-[#92400E] dark:text-[#FCD34D]">
                          {alert.size}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">
                      {alert.quantity.toLocaleString()} /{" "}
                      {alert.stockAlertLevel.toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-red-500">
                      Short by {shortfall.toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </AdminPage>
  );
}