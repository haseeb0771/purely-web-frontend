"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Droplets,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import {
  adminNavItems,
  findActiveGroup,
  type AdminNavItem,
} from "./admin-nav";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const EXPANDED_WIDTH = "w-[260px]";
const COLLAPSED_WIDTH = "w-20";

function isChildActive(pathname: string, href: string): boolean {
  return pathname === href;
}

export default function AdminSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const previousPathname = useRef(pathname);

  const activeGroup = findActiveGroup(adminNavItems, pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    setOpenGroups((current) => {
      const next = { ...current };
      for (const item of adminNavItems) {
        if (item.type === "group") {
          const matches = item.children.some((child) =>
            isChildActive(pathname, child.href)
          );
          if (matches) next[item.label] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  function handleGroupToggle(item: AdminNavItem & { type: "group" }) {
    if (collapsed) {
      onToggleCollapse();
      setOpenGroups((current) => ({ ...current, [item.label]: true }));
      return;
    }
    setOpenGroups((current) => ({
      ...current,
      [item.label]: !current[item.label],
    }));
  }

  function handleMobileNavClick() {
    onCloseMobile();
  }

  const sidebarWidth = mobileOpen
    ? EXPANDED_WIDTH
    : collapsed
      ? COLLAPSED_WIDTH
      : EXPANDED_WIDTH;

  const renderNavItem = (item: AdminNavItem) => {
    if (item.type === "link") {
      const active = isChildActive(pathname, item.href);
      return (
        <li key={item.href} className="px-3">
          <Link
            href={item.href}
            onClick={handleMobileNavClick}
            title={item.subtitle}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:border-[#2FB9BF]/40 hover:bg-[#F8FAFC] dark:hover:border-[#2FB9BF]/40 dark:hover:bg-[#1E293B] ${
              active
                ? "border-[#2FB9BF]/40 bg-[#E6F7F8] text-[#0E7A80] dark:border-[#2FB9BF]/40 dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                : "text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#E2E8F0]"
            }`}
          >
            <item.icon
              className={`h-5 w-5 shrink-0 ${
                active ? "text-[#2FB9BF]" : "text-[#64748B] group-hover:text-[#2FB9BF]"
              }`}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2FB9BF]" />
            )}
          </Link>
        </li>
      );
    }

    const groupOpen = Boolean(openGroups[item.label]);
    const groupActive = activeGroup === item.label;

    return (
      <li key={item.label} className="px-3">
        <button
          type="button"
          onClick={() => handleGroupToggle(item)}
          aria-expanded={groupOpen}
          title={item.label}
          className={`group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:border-[#2FB9BF]/40 hover:bg-[#F8FAFC] dark:hover:border-[#2FB9BF]/40 dark:hover:bg-[#1E293B] ${
            groupActive
              ? "border-[#2FB9BF]/40 bg-[#E6F7F8] text-[#0E7A80] dark:border-[#2FB9BF]/40 dark:bg-[#163A3B] dark:text-[#5EEAD4]"
              : "text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#E2E8F0]"
          }`}
        >
          <item.icon
            className={`h-5 w-5 shrink-0 ${
              groupActive
                ? "text-[#2FB9BF]"
                : "text-[#64748B] group-hover:text-[#2FB9BF]"
            }`}
          />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">{item.label}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform duration-200 ${
                  groupOpen ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>

        {groupOpen && !collapsed && (
          <ul className="ml-5 mt-1 space-y-1 border-l border-[#E2E8F0] pl-3 dark:border-[#1E293B]">
            {item.children.map((child) => {
              const childActive = isChildActive(pathname, child.href);
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={handleMobileNavClick}
                    aria-current={childActive ? "page" : undefined}
                    className={`flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 hover:bg-[#F8FAFC] hover:text-[#2FB9BF] dark:hover:bg-[#1E293B] ${
                      childActive
                        ? "bg-[#E6F7F8] text-[#0E7A80] dark:bg-[#163A3B] dark:text-[#5EEAD4]"
                        : "text-[#475569] dark:text-[#94A3B8]"
                    }`}
                  >
                    <span
                      className={`mr-2 h-1 w-1 shrink-0 rounded-full ${
                        childActive ? "bg-[#2FB9BF]" : "bg-[#CBD5E1] dark:bg-[#334155]"
                      }`}
                    />
                    <span className="truncate">{child.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0F172A]/30 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`z-50 shrink-0 flex-col border-r border-[#E2E8F0] bg-white transition-[width] duration-300 ease-in-out dark:border-[#1E293B] dark:bg-[#0F172A] ${sidebarWidth} ${
          mobileOpen ? "fixed inset-y-0 left-0 flex" : "hidden lg:flex"
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-[#E2E8F0] dark:border-[#1E293B] ${
            collapsed ? "justify-center px-2" : "px-5"
          }`}
        >
          {!collapsed ? (
            <Link
              href="/admin/dashboard"
              onClick={handleMobileNavClick}
              className="flex items-center"
              title="Purely Admin"
            >
              <Image
                src="/logo.png"
                alt="Purely"
                width={363}
                height={130}
                priority
                className="h-8 w-auto"
              />
            </Link>
          ) : (
            <Link
              href="/admin/dashboard"
              onClick={handleMobileNavClick}
              className="flex items-center justify-center"
              title="Purely Admin"
            >
              <Image
                src="/favi.png"
                alt="Purely icon"
                width={361}
                height={361}
                priority
                className="h-9 w-9 rounded-xl object-contain"
              />
            </Link>
          )}
          {mobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="ml-auto rounded-lg p-1.5 text-[#64748B] transition-colors hover:text-[#0F172A] dark:hover:text-[#E2E8F0] lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <ul className="space-y-1">{adminNavItems.map(renderNavItem)}</ul>
        </nav>

        <div className="border-t border-[#E2E8F0] p-3 dark:border-[#1E293B]">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-[#475569] transition-all duration-200 hover:border-[#2FB9BF]/40 hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#1E293B] dark:hover:text-[#E2E8F0] ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 text-[#64748B]" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 text-[#64748B]" />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>

          <div
            className={`mt-2 flex items-center gap-2 rounded-xl bg-[#F8FAFC] px-3 py-2 text-[11px] font-medium text-[#94A3B8] dark:bg-[#1E293B] dark:text-[#64748B] ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Droplets className={`h-3.5 w-3.5 shrink-0 text-[#2FB9BF]`} />
            {!collapsed && <span>v1.0 — Purely Admin</span>}
          </div>
        </div>
      </aside>
    </>
  );
}