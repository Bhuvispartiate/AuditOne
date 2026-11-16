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
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pmsStore } from "@/lib/data/store";
import {
  isEmployeeRestricted,
  isSuperAdmin,
  isTaskAssignedToEmployee,
} from "@/lib/access";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

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

function formatRoleName(role?: string, isSuper = false): string {
  if (isSuper || role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Administrator";
  if (role === "DIRECTOR") return "Director";
  if (role === "HEAD") return "Department Head";
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "TRAINEE") return "Trainee";
  return "Staff Member";
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
        "relative flex flex-col bg-[#272769] text-white select-none overflow-hidden shrink-0",
        isMobile
          ? "w-full h-full rounded-r-[28px] shadow-2xl border-r border-[#3B3B88]"
          : cn(
              "rounded-[28px] border border-[#3B3B88] shadow-[0_12px_36px_rgba(30,30,79,0.35)] transition-all duration-300 ease-in-out z-30",
              effectiveCollapsed ? "w-[78px]" : "w-[248px]"
            )
      )}
    >
      {/* Brand Header with Navy and Gold accents */}
      <div className="flex h-[74px] items-center justify-between px-4 pt-1">
        <Link
          to="/dashboard"
          onClick={() => { if (isMobile) onClose?.(); }}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E0A95C] text-[#272769] shadow-xs">
            <Zap className="h-4.5 w-4.5 fill-[#272769]" />
          </div>
          {!effectiveCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-white tracking-tight text-[15px] leading-tight">
                Linear Audit
              </span>
              <span className="text-[10px] font-bold text-[#E0A95C] uppercase tracking-widest mt-0.5">
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
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3B3B88] bg-[#32327D] text-white hover:bg-[#3B3B88] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        ) : !effectiveCollapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#3B3B88] bg-[#32327D] text-white hover:text-white hover:bg-[#3B3B88] transition-colors"
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
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#3B3B88] bg-[#32327D] text-white hover:text-white hover:bg-[#3B3B88] transition-colors"
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
                  ? "bg-[#E0A95C] text-[#1E1E4F] font-bold shadow-xs"
                  : "text-white hover:bg-[#32327D] hover:text-white font-medium"
              )}
            >
              <Link
                to={item.href}
                onClick={() => {
                  if (isMobile) onClose?.();
                }}
                className={cn(
                  "flex flex-1 min-w-0 items-center gap-3 px-3.5 py-2.5 text-[13px]",
                  isActive ? "text-[#1E1E4F]" : "text-white"
                )}
                title={effectiveCollapsed ? item.title : undefined}
              >
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:scale-105",
                    isActive ? "text-[#1E1E4F]" : "text-white group-hover:text-white"
                  )}
                />
                {!effectiveCollapsed && (
                  <span className={cn("truncate flex-1 tracking-tight", isActive ? "text-[#1E1E4F]" : "text-white")}>
                    {item.title}
                  </span>
                )}
                {!effectiveCollapsed && taskBadge !== undefined && (
                  <span
                    className={cn(
                      "ml-auto flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      isActive
                        ? "bg-[#272769] text-white"
                        : "bg-[#E0A95C] text-[#1E1E4F]"
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
        <div className="px-3 pt-2 pb-2 border-t border-[#3B3B88] space-y-1">
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
                    ? "bg-[#E0A95C] text-[#1E1E4F] font-bold shadow-xs"
                    : "text-white hover:bg-[#32327D] hover:text-white"
                )}
                title={effectiveCollapsed ? item.title : undefined}
              >
                <Icon className={cn("h-[17px] w-[17px] shrink-0", isActive ? "text-[#1E1E4F]" : "text-white group-hover:text-white")} />
                {!effectiveCollapsed && <span className={cn("truncate flex-1", isActive ? "text-[#1E1E4F]" : "text-white")}>{item.title}</span>}
                {!effectiveCollapsed && badgeValue !== undefined && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#3B3B88] px-1.5 text-[10px] font-bold text-white">
                    {badgeValue}
                  </span>
                )}
              </Link>
            );
          })}

          <Link
            to="/reports"
            onClick={() => { if (isMobile) onClose?.(); }}
            className="group flex items-center gap-3 rounded-full px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#32327D] hover:text-white transition-all duration-150"
            title={effectiveCollapsed ? "Help & Support" : undefined}
          >
            <HelpCircle className="h-[17px] w-[17px] shrink-0 text-white group-hover:text-white" />
            {!effectiveCollapsed && <span className="truncate flex-1 text-white">Help & Support</span>}
          </Link>
        </div>
      )}

      {/* Bottom User Profile Pill */}
      <div className="p-3 border-t border-[#3B3B88]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2.5 rounded-2xl p-2 bg-[#32327D] hover:bg-[#3B3B88] border border-[#444498] transition-all shadow-2xs text-left group cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#E0A95C]/40",
                effectiveCollapsed && "justify-center"
              )}
              title={effectiveCollapsed ? currentUser?.full_name || "User Profile" : undefined}
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E0A95C] border border-[#E0A95C] text-xs font-bold text-[#1E1E4F] shadow-xs select-none">
                <span>{initials}</span>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#272769]"
                  title="Active Session"
                />
              </div>

              {!effectiveCollapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-white">
                        {currentUser?.full_name || "Administrator"}
                      </p>
                      {isSuperAdminUser && (
                        <span className="shrink-0 px-1 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wider bg-[#E0A95C] text-[#1E1E4F] border border-[#E0A95C]">
                          Root
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/80 truncate mt-0.5 leading-tight group-hover:text-white">
                      {currentUser?.designation_name
                        ? currentUser.designation_name
                        : formatRoleName(currentUser?.role_code, isSuperAdminUser)}
                      {isEmployee ? " • View Only" : ""}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-white group-hover:text-white shrink-0 transition-transform duration-150" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={effectiveCollapsed ? "right" : "top"}
            align={effectiveCollapsed ? "end" : "start"}
            sideOffset={8}
            className="w-60 p-1.5 rounded-2xl border border-[#3B3B88] bg-[#272769] text-white shadow-2xl z-50"
          >
            <DropdownMenuLabel className="px-3 py-2 text-xs font-normal text-[#ABA8D8]">
              <div className="font-bold text-sm text-white truncate">
                {currentUser?.full_name || "Administrator"}
              </div>
              <div className="text-[11px] text-[#ABA8D8] truncate mt-0.5">
                {currentUser?.email || "admin@pms.internal"}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#32327D] border border-[#444498] text-[#E0A95C]">
                <ShieldCheck className="h-3 w-3 text-[#E0A95C]" />
                {formatRoleName(currentUser?.role_code, isSuperAdminUser)}
                {isEmployee ? " (View Only)" : ""}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#3B3B88]" />

            {currentUser?.id && (
              <DropdownMenuItem
                asChild
                className="rounded-xl cursor-pointer text-xs font-medium text-white hover:bg-[#32327D] hover:text-white focus:bg-[#32327D] focus:text-white"
              >
                <Link
                  to={`/employees/${currentUser.id}`}
                  onClick={() => { if (isMobile) onClose?.(); }}
                >
                  <User className="mr-2 h-4 w-4 text-[#ABA8D8]" />
                  <span>My Directory Profile</span>
                </Link>
              </DropdownMenuItem>
            )}

            {!isEmployee && (
              <DropdownMenuItem
                asChild
                className="rounded-xl cursor-pointer text-xs font-medium text-white hover:bg-[#32327D] hover:text-white focus:bg-[#32327D] focus:text-white"
              >
                <Link
                  to="/settings"
                  onClick={() => { if (isMobile) onClose?.(); }}
                >
                  <Settings className="mr-2 h-4 w-4 text-[#ABA8D8]" />
                  <span>System Settings</span>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-[#3B3B88]" />

            <DropdownMenuItem
              asChild
              className="rounded-xl cursor-pointer text-xs font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 focus:bg-rose-950/40 focus:text-rose-200"
            >
              <Link
                to="/login"
                onClick={() => {
                  pmsStore.signOut();
                  createClient().auth.signOut().catch(() => {});
                  if (isMobile) onClose?.();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
