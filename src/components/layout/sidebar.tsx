import React, { useEffect, useState } from "react";
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
  Users,
  FileText,
  Bell,
  BarChart3,
  Settings,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ChevronsLeft,
  Zap,
  ChevronDown,
  HelpCircle,
  Trash2,
  KeyRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pmsStore } from "@/lib/data/store";
import {
  isEmployeeRestricted,
  isSuperAdmin,
  isTaskAssignedToEmployee,
} from "@/lib/access";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
}

const EMPLOYEE_ALLOWED_HREFS = new Set([
  "/dashboard",
  "/projects",
  "/tasks",
  "/clients",
  "/workflows",
  "/attendance",
  "/documents",
  "/recycle-bin",
  "/vault",
]);

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { title: "Client 360°", href: "/clients", icon: Users2 },
  { title: "Projects", href: "/projects", icon: FolderGit2 },
  { title: "Tasks", href: "/tasks", icon: CheckSquare },
  { title: "Vault", href: "/vault", icon: KeyRound },
  { title: "Services", href: "/services", icon: Briefcase },
  { title: "Workflows", href: "/workflows", icon: GitBranch },
  { title: "Finance", href: "/finance", icon: CreditCard },
  { title: "Invoices", href: "/invoices", icon: Receipt },
  { title: "Team", href: "/teams", icon: Users },
  { title: "Employees", href: "/employees", icon: UserCheck },
  { title: "Admins", href: "/admins", icon: ShieldCheck, superAdminOnly: true },
  { title: "Attendance", href: "/attendance", icon: MapPin },
  { title: "Documents", href: "/documents", icon: FileText },
  { title: "Recycle Bin", href: "/recycle-bin", icon: Trash2 },
  { title: "Reports", href: "/reports", icon: BarChart3 },
];

const footerNavItems: NavItem[] = [
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Settings", href: "/settings", icon: Settings },
];

export interface AppSidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ isMobile = false, onClose }: AppSidebarProps = {}) {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const effectiveCollapsed = isMobile ? false : collapsed;
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const isSuperAdminUser = isSuperAdmin(currentUser);
  const employeeId = currentUser?.id || "";
  const tasks = pmsStore.getTasks();

  const visibleNavItems = isEmployee
    ? mainNavItems.filter((item) => EMPLOYEE_ALLOWED_HREFS.has(item.href))
    : mainNavItems.filter((item) => !item.superAdminOnly || isSuperAdminUser);

  const visibleTasks = isEmployee
    ? tasks.filter((t) => isTaskAssignedToEmployee(t, employeeId))
    : tasks;

  const notifications = pmsStore.getNotifications();
  const pendingTasksCount = visibleTasks.filter((t) => t.status !== "Completed").length;
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
        "relative flex flex-col bg-[#201815] text-[#FAF8F5] select-none overflow-hidden shrink-0",
        isMobile
          ? "w-full h-full rounded-r-[28px] shadow-2xl border-r border-[#382620]"
          : cn(
              "rounded-[28px] border border-[#382620] shadow-[0_12px_36px_rgba(20,14,12,0.35)] transition-all duration-300 ease-in-out z-30",
              effectiveCollapsed ? "w-[78px]" : "w-[248px]"
            )
      )}
    >
      {/* Brand Header matching minimalist luxury aesthetic */}
      <div className="flex h-[74px] items-center justify-between px-4 pt-1">
        <Link
          to="/dashboard"
          onClick={() => { if (isMobile) onClose?.(); }}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF8F5] text-[#201815] shadow-xs">
            <Zap className="h-4.5 w-4.5 fill-[#201815]" />
          </div>
          {!effectiveCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-[#FAF8F5] tracking-tight text-[15px] leading-tight">
                Linear Audit
              </span>
              <span className="text-[10px] font-bold text-[#A89E92] uppercase tracking-widest mt-0.5">
                Practice OS
              </span>
            </div>
          )}
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            title="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#382620] bg-[#2A1C17] text-[#FAF8F5] hover:bg-[#34241E] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        ) : !effectiveCollapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#382620] bg-[#2A1C17] text-[#A89E92] hover:text-[#FAF8F5] hover:bg-[#34241E] transition-colors"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {!isMobile && effectiveCollapsed && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#382620] bg-[#2A1C17] text-[#A89E92] hover:text-[#FAF8F5] hover:bg-[#34241E] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 scrollbar-none">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname
            ? pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            : false;
          const taskBadge = item.href === "/tasks" && pendingTasksCount > 0 ? pendingTasksCount : undefined;

          return (
            <div
              key={item.href}
              className={cn(
                "group flex items-center rounded-full transition-all duration-150 relative",
                isActive
                  ? "bg-[#9A97A8] text-white font-semibold shadow-xs"
                  : "text-[#C4B7A6] hover:bg-[#2C1E19] hover:text-[#FAF8F5] font-medium"
              )}
            >
              <Link
                to={item.href}
                onClick={() => {
                  if (isMobile) onClose?.();
                }}
                className="flex flex-1 min-w-0 items-center gap-3 px-3.5 py-2.5 text-[13px]"
                title={effectiveCollapsed ? item.title : undefined}
              >
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:scale-105",
                    isActive ? "text-white" : "text-[#A89E92] group-hover:text-[#FAF8F5]"
                  )}
                />
                {!effectiveCollapsed && (
                  <span className="truncate flex-1 tracking-tight">{item.title}</span>
                )}
                {!effectiveCollapsed && taskBadge !== undefined && (
                  <span
                    className={cn(
                      "ml-auto flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#34241E] text-[#FAF8F5]"
                    )}
                  >
                    {taskBadge}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Bottom Utility Navigation */}
      {!isEmployee && (
        <div className="px-3 pt-2 pb-2 border-t border-[#382620] space-y-1">
          {footerNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname ? pathname.startsWith(item.href) : false;
            const badgeValue = item.href === "/notifications" && unreadCount > 0 ? unreadCount : undefined;

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => { if (isMobile) onClose?.(); }}
                className={cn(
                  "group flex items-center gap-3 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#9A97A8] text-white font-semibold shadow-xs"
                    : "text-[#C4B7A6] hover:bg-[#2C1E19] hover:text-[#FAF8F5]"
                )}
                title={effectiveCollapsed ? item.title : undefined}
              >
                <Icon className="h-[17px] w-[17px] shrink-0 text-[#A89E92] group-hover:text-[#FAF8F5]" />
                {!effectiveCollapsed && <span className="truncate flex-1">{item.title}</span>}
                {!effectiveCollapsed && badgeValue !== undefined && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#34241E] px-1.5 text-[10px] font-bold text-[#FAF8F5]">
                    {badgeValue}
                  </span>
                )}
              </Link>
            );
          })}

          <Link
            to="/reports"
            onClick={() => { if (isMobile) onClose?.(); }}
            className="group flex items-center gap-3 rounded-full px-3.5 py-2 text-[13px] font-medium text-[#C4B7A6] hover:bg-[#2C1E19] hover:text-[#FAF8F5] transition-all duration-150"
            title={effectiveCollapsed ? "Help & Support" : undefined}
          >
            <HelpCircle className="h-[17px] w-[17px] shrink-0 text-[#A89E92] group-hover:text-[#FAF8F5]" />
            {!effectiveCollapsed && <span className="truncate flex-1">Help & Support</span>}
          </Link>
        </div>
      )}

      {/* Bottom User Profile Pill */}
      <div className="p-3 border-t border-[#382620]">
        <Link
          to={isEmployee ? "/dashboard" : "/settings"}
          onClick={() => { if (isMobile) onClose?.(); }}
          className={cn(
            "flex items-center gap-2.5 rounded-2xl p-2 bg-[#2A1C17] hover:bg-[#34241E] border border-[#3E2C24] transition-colors shadow-2xs",
            effectiveCollapsed && "justify-center"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-xs font-black text-[#201815] shadow-xs">
            {initials}
          </div>
          {!effectiveCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#FAF8F5] truncate">
                  {currentUser?.full_name || "Administrator"}
                </p>
                <p className="text-[10px] text-[#A89E92] truncate">
                  {isEmployee
                    ? `${currentUser?.designation_name || currentUser?.role_code} • View Only`
                    : currentUser?.designation_name || currentUser?.role_code || "Practice Admin"}
                </p>
              </div>
              {!isEmployee && <ChevronDown className="h-3.5 w-3.5 text-[#A89E92] shrink-0" />}
            </>
          )}
        </Link>
      </div>
    </aside>
  );
}
