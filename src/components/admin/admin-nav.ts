import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardList,
  FileClock,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Package,
  Palette,
  Settings,
  TriangleAlert,
} from "lucide-react";

export interface AdminChildLink {
  label: string;
  href: string;
}

export interface AdminLinkItem {
  type: "link";
  label: string;
  href: string;
  icon: LucideIcon;
  subtitle: string;
  badge?: "stock-alerts";
}

export interface AdminGroupItem {
  type: "group";
  label: string;
  icon: LucideIcon;
  children: AdminChildLink[];
}

export type AdminNavItem = AdminLinkItem | AdminGroupItem;

export const adminNavItems: AdminNavItem[] = [
  {
    type: "link",
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    subtitle: "Dashboard Overview",
  },
  {
    type: "link",
    label: "Activity Logs",
    href: "/admin/activity-logs",
    icon: FileClock,
    subtitle: "Audit trail of admin changes",
  },
  {
    type: "link",
    label: "Inquiries",
    href: "/admin/inquiries",
    icon: Inbox,
    subtitle: "Contact form submissions",
  },
  {
    type: "link",
    label: "New Label Design",
    href: "/admin/new-label-design",
    icon: Palette,
    subtitle: "AI label mockup studio",
  },
  {
    type: "link",
    label: "Stock Alerts",
    href: "/admin/inventory/stock-alerts",
    icon: TriangleAlert,
    subtitle: "Low-stock inventory alerts",
    badge: "stock-alerts",
  },
  {
    type: "link",
    label: "Marketing",
    href: "/admin/marketing",
    icon: Megaphone,
    subtitle: "Leads, clients & deal pipelines",
  },
  {
    type: "group",
    label: "Inventory",
    icon: Package,
    children: [
      { label: "Bottles", href: "/admin/inventory/bottles" },
      { label: "Caps", href: "/admin/inventory/caps" },
      { label: "PET Packaging", href: "/admin/inventory/pet-packaging" },
      { label: "Labels", href: "/admin/inventory/labels" },
      { label: "Inventory Orders", href: "/admin/inventory/orders" },
    ],
  },
  {
    type: "group",
    label: "Orders",
    icon: ClipboardList,
    children: [
      { label: "Create Order", href: "/admin/orders/create" },
      { label: "All Orders", href: "/admin/orders" },
    ],
  },
  {
    type: "group",
    label: "Finance",
    icon: BarChart3,
    children: [
      { label: "Overview & Reports", href: "/admin/finance/overview" },
      { label: "Manage Expenses", href: "/admin/finance/expenses" },
    ],
  },
];

export function findActiveGroup(
  items: AdminNavItem[],
  pathname: string
): string | null {
  for (const item of items) {
    if (item.type === "group") {
      const match = item.children.find((child) => pathname.startsWith(child.href));
      if (match) return item.label;
    }
  }
  return null;
}