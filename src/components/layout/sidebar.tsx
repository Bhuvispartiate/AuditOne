"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users2,
  Briefcase,
  FolderGit2,
  CheckSquare,
  GitBranch,
  CreditCard,
  Receipt,
  UserCheck,
  Building2,
  Users,
  FileText,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  ChevronsLeft,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pmsStore } from "@/lib/data/store";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  category?: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutGrid, category: "Core" },
  { title: "Client 360°", href: "/clients", icon: Users2, category: "Core" },
  { title: "Services", href: "/services", icon: Briefcase, category: "Core" },
  { title: "Projects", href: "/projects", icon: FolderGit2, category: "Operations" },
  { title: "Tasks", href: "/tasks", icon: CheckSquare, category: "Operations" },
  { title: "Workflow Management", href: "/workflows", icon: GitBranch, category: "Operations" },
  { title: "Finance & Payments", href: "/finance", icon: CreditCard, category: "Finance" },
  { title: "Invoice Generator", href: "/invoices", icon: Receipt, category: "Finance" },
  { title: "Employee Directory", href: "/employees", icon: UserCheck, category: "Organization" },
  { title: "Departments", href: "/departments", icon: Building2, category: "Organization" },
  { title: "Team Management", href: "/teams", icon: Users, category: "Organization" },
  { title: "Documents", href: "/documents", icon: FileText, category: "Assets" },
  { title: "Notifications", href: "/notifications", icon: Bell, category: "Assets" },
  { title: "Reports & Analytics", href: "/reports", icon: BarChart3, category: "Assets" },
  { title: "Settings", href: "/settings", icon: Settings, category: "Assets" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [showPromo, setShowPromo] = useState(true);

  const notifications = pmsStore.getNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-[#e5e7eb] bg-white transition-all duration-300 ease-in-out z-30 select-none shadow-[0_2px_12px_rgba(0,0,0,0.02)]",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}
    >
      {/* Brand Header — ACRU Style */}
      <div className="flex h-20 items-center justify-between px-6 border-b border-transparent">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm font-black text-lg tracking-wider">
            A
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-[#111827] tracking-tight text-xl leading-none">
                ACRU
              </span>
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mt-1">
                PMS Suite
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-1 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname
            ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            : false;
          const badgeValue = item.href === "/notifications" && unreadCount > 0 ? unreadCount : item.badge;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-150 relative",
                isActive
                  ? "bg-[#f3f4f6] text-[#111827] font-semibold"
                  : "text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#111827]"
              )}
              title={collapsed ? item.title : undefined}
            >
              {isActive && (
                <div className="absolute left-1.5 top-3 bottom-3 w-[3px] bg-[#111827] rounded-full" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105",
                  isActive ? "text-[#111827]" : "text-[#9ca3af] group-hover:text-[#111827]"
                )}
              />
              {!collapsed && (
                <span className="truncate flex-1 tracking-tight text-[13px]">{item.title}</span>
              )}
              {!collapsed && badgeValue && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#111827] px-1.5 text-[10px] font-bold text-white">
                  {badgeValue}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Upgrade / System Card (from reference image) */}
      {!collapsed && showPromo && (
        <div className="mx-3.5 mb-3 p-4 rounded-2xl bg-[#f9fafb] border border-[#e5e7eb] relative shadow-xs">
          <button
            onClick={() => setShowPromo(false)}
            className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white mb-2 shadow-xs">
            <Zap className="h-4 w-4 fill-white" />
          </div>
          <h4 className="font-bold text-sm text-[#111827] tracking-tight">Enterprise Pro</h4>
          <p className="text-[11px] text-[#6b7280] mt-1 leading-snug">
            Full compliance analytics, Cloudflare R2 vaults and GST auto-filing.
          </p>
          <Link href="/settings">
            <button className="mt-3 w-full rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-semibold py-2 px-3 transition-colors shadow-xs">
              System Settings
            </button>
          </Link>
        </div>
      )}

      {/* Collapse Toggle Footer */}
      <div className="p-3.5 border-t border-[#f3f4f6] flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-2 text-xs font-medium text-[#6b7280] hover:text-[#111827] transition-colors rounded-xl p-2 w-full",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>Collapse sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

