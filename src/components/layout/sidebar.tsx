import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  ChevronRight,
  ChevronsLeft,
  Zap,
  ChevronDown,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pmsStore } from "@/lib/data/store";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { title: "Projects", href: "/projects", icon: FolderGit2 },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Client 360°", href: "/clients", icon: Users2 },
  { title: "Services", href: "/services", icon: Briefcase },
  { title: "Workflows", href: "/workflows", icon: GitBranch },
  { title: "Finance", href: "/finance", icon: CreditCard },
  { title: "Invoices", href: "/invoices", icon: Receipt },
  { title: "Team", href: "/teams", icon: Users },
  { title: "Employees", href: "/employees", icon: UserCheck },
  { title: "Departments", href: "/departments", icon: Building2 },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Reports", href: "/reports", icon: BarChart3 },
];

const footerNavItems: NavItem[] = [
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const currentUser = pmsStore.getCurrentUser();
  const tasks = pmsStore.getTasks();
  const notifications = pmsStore.getNotifications();
  const pendingTasksCount = tasks.filter((t) => t.status !== "Completed").length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const initials =
    currentUser?.full_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "AD";

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-[#16172d] text-white rounded-[26px] border border-[#282a4c] shadow-[0_14px_34px_rgba(22,23,45,0.22)] transition-all duration-300 ease-in-out z-30 select-none overflow-hidden shrink-0",
        collapsed ? "w-[78px]" : "w-[248px]"
      )}
    >
      {/* Brand Header matching reference dark indigo sidebar */}
      <div className="flex h-[74px] items-center justify-between px-4 pt-1">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] text-white shadow-[0_4px_14px_rgba(108,92,231,0.45)]">
            <Zap className="h-4.5 w-4.5 fill-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-white tracking-tight text-lg leading-none">
                ACRU
              </span>
              <span className="text-[10px] font-semibold text-[#8a8fb5] uppercase tracking-widest mt-1">
                PMS Suite
              </span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#9ca3c0] hover:bg-white/10 hover:text-white transition-colors"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#9ca3c0] hover:bg-white/10 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 scrollbar-none">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname
            ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            : false;
          const taskBadge = item.href === "/tasks" && pendingTasksCount > 0 ? pendingTasksCount : undefined;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-150 relative",
                isActive
                  ? "bg-gradient-to-r from-[#6c5ce7] to-[#5b4cdb] text-white font-semibold shadow-[0_6px_18px_rgba(108,92,231,0.38)]"
                  : "text-[#a3a8c3] hover:bg-white/[0.06] hover:text-white"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon
                className={cn(
                  "h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:scale-105",
                  isActive ? "text-white" : "text-[#858bb0] group-hover:text-white"
                )}
              />
              {!collapsed && (
                <span className="truncate flex-1 tracking-tight">{item.title}</span>
              )}
              {!collapsed && taskBadge !== undefined && (
                <span
                  className={cn(
                    "ml-auto flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#2a2d4e] text-[#c7d2fe]"
                  )}
                >
                  {taskBadge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Utility Navigation */}
      <div className="px-3 pt-2 pb-2 border-t border-white/[0.07] space-y-1">
        {footerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname ? pathname.startsWith(item.href) : false;
          const badgeValue = item.href === "/notifications" && unreadCount > 0 ? unreadCount : undefined;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-gradient-to-r from-[#6c5ce7] to-[#5b4cdb] text-white font-semibold shadow-[0_6px_18px_rgba(108,92,231,0.38)]"
                  : "text-[#a3a8c3] hover:bg-white/[0.06] hover:text-white"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" />
              {!collapsed && <span className="truncate flex-1">{item.title}</span>}
              {!collapsed && badgeValue !== undefined && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6c5ce7] px-1.5 text-[10px] font-bold text-white">
                  {badgeValue}
                </span>
              )}
            </Link>
          );
        })}

        <Link
          to="/reports"
          className="group flex items-center gap-3 rounded-xl px-3.5 py-2 text-[13px] font-medium text-[#a3a8c3] hover:bg-white/[0.06] hover:text-white transition-all duration-150"
          title={collapsed ? "Help & Support" : undefined}
        >
          <HelpCircle className="h-[17px] w-[17px] shrink-0" />
          {!collapsed && <span className="truncate flex-1">Help & Support</span>}
        </Link>
      </div>

      {/* Bottom User Profile Pill (Matching reference image) */}
      <div className="p-3 border-t border-white/[0.07]">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-2xl p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors",
            collapsed && "justify-center"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-xs font-extrabold text-white shadow-xs">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser?.full_name || "Administrator"}
                </p>
                <p className="text-[10px] text-[#8a8fb5] truncate">
                  {currentUser?.designation_name || currentUser?.role_code || "Practice Admin"}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#8a8fb5] shrink-0" />
            </>
          )}
        </Link>
      </div>
    </aside>
  );
}
