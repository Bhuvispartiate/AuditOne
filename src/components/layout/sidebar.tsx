import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Users2,
  Briefcase,
  FolderGit2,
  CheckSquare,
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
  KeyRound,
  X,
  User,
  LogOut,
  Layers,
  FolderArchive,
  MessageSquare,
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

export interface NavSubItem {
  title: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
  badge?: "tasks" | "notifications";
}

export interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavSubItem[];
  superAdminOnly?: boolean;
}

export interface StandaloneNavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
  badge?: "tasks" | "notifications";
}

const EMPLOYEE_ALLOWED_HREFS = new Set([
  "/dashboard",
  "/services",
  "/whatsapp",
  "/reports",
  "/projects",
  "/tasks",
  "/clients",
  "/attendance",
  "/documents",
  "/recycle-bin",
  "/vault",
]);

// Top standalone items: Dashboard, Services, WhatsApp Automation, Reports
const topStandaloneItems: StandaloneNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { title: "Services", href: "/services", icon: Briefcase },
  { title: "WhatsApp Automation", href: "/whatsapp", icon: MessageSquare },
  { title: "Reports", href: "/reports", icon: BarChart3 },
];

// Super Admin exclusive standalone item: Only Manages Owner Mail ID and Owner Activities
const superAdminStandaloneItems: StandaloneNavItem[] = [
  { title: "Owner Management", href: "/admins", icon: ShieldCheck },
];

// Dropdown Categorized Groups for Owner / Admins
const navGroups: NavGroup[] = [
  {
    id: "audit360",
    title: "Audit360",
    icon: Layers,
    items: [
      { title: "Clients", href: "/clients", icon: Users2 },
      { title: "Projects", href: "/projects", icon: FolderGit2 },
      { title: "Tasks", href: "/tasks", icon: CheckSquare, badge: "tasks" },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    icon: CreditCard,
    items: [
      { title: "Finance Overview", href: "/finance", icon: CreditCard },
      { title: "Invoices", href: "/invoices", icon: Receipt },
    ],
  },
  {
    id: "administration",
    title: "Administration",
    icon: Users,
    items: [
      { title: "Admins", href: "/admins", icon: ShieldCheck },
      { title: "Team", href: "/teams", icon: Users },
      { title: "Employees", href: "/employees", icon: UserCheck },
      { title: "Attendance", href: "/attendance", icon: MapPin },
    ],
  },
  {
    id: "assets",
    title: "Assets & Records",
    icon: FolderArchive,
    items: [
      { title: "Vault", href: "/vault", icon: KeyRound },
      { title: "Documents", href: "/documents", icon: FileText },
    ],
  },
];

// Bottom Standalone Navigation Items (Settings and Notifications at the bottom of the sidebar)
const bottomStandaloneItems: StandaloneNavItem[] = [
  { title: "Notifications", href: "/notifications", icon: Bell, badge: "notifications" },
  { title: "Settings", href: "/settings", icon: Settings },
];

export interface AppSidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

function formatRoleName(role?: string, isSuper = false): string {
  if (isSuper || role === "SUPER_ADMIN") return "Super Admin";
  if (role === "OWNER") return "Firm Owner";
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

  // Group expand/collapse state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    audit360: true,
    finance: false,
    administration: false,
    assets: false,
  });

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const isSuperAdminUser = isSuperAdmin(currentUser);
  const employeeId = currentUser?.id || "";
  const tasks = pmsStore.getTasks();

  const visibleTasks = isEmployee
    ? tasks.filter((t) => isTaskAssignedToEmployee(t, employeeId))
    : tasks;

  const notifications = pmsStore.getNotifications();
  const pendingTasksCount = visibleTasks.filter((t) => t.status !== "Completed").length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getBadgeValue = (badge?: "tasks" | "notifications") => {
    if (badge === "tasks" && pendingTasksCount > 0) return pendingTasksCount;
    if (badge === "notifications" && unreadCount > 0) return unreadCount;
    return undefined;
  };

  // Helper to filter subitems by employee / superadmin permissions
  const filterSubItems = (items: NavSubItem[]) => {
    return items.filter((item) => {
      if (item.superAdminOnly && !isSuperAdminUser) return false;
      if (isEmployee && !EMPLOYEE_ALLOWED_HREFS.has(item.href)) return false;
      return true;
    });
  };

  // Check if a group contains the current active route
  const isGroupActive = (group: NavGroup) => {
    return group.items.some(
      (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
    );
  };

  // Automatically keep current route's group expanded
  useEffect(() => {
    navGroups.forEach((group) => {
      if (isGroupActive(group)) {
        setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const initials = useMemo(() => {
    return (
      currentUser?.full_name
        ?.split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "AO"
    );
  }, [currentUser?.full_name]);

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-[#272769] text-white select-none overflow-hidden shrink-0 border border-[#383882] shadow-[0_12px_36px_rgba(20,20,60,0.25)]",
        isMobile
          ? "w-full h-full rounded-r-[24px]"
          : cn(
              "rounded-[24px] transition-all duration-300 ease-in-out z-30",
              effectiveCollapsed ? "w-[76px]" : "w-[252px]"
            )
      )}
    >
      {/* Brand Header */}
      <div className="flex h-[70px] items-center justify-between px-4 border-b border-[#383882]">
        <Link
          to={isSuperAdminUser ? "/admins" : "/dashboard"}
          onClick={() => {
            if (isMobile) onClose?.();
          }}
          className="flex items-center gap-3 overflow-hidden group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#272769] shadow-sm group-hover:scale-105 transition-transform">
            <Zap className="h-5 w-5 fill-[#272769] text-[#272769]" />
          </div>
          {!effectiveCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-extrabold text-white tracking-tight text-[15px] leading-tight group-hover:text-[#E3E2F5] transition-colors">
                AuditOne
              </span>
              <span className="text-[9.5px] font-bold text-[#ABA8D8] uppercase tracking-widest mt-0.5">
                Practice OS • Trial
              </span>
            </div>
          )}
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            title="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#383882] bg-[#32327D] text-[#C5C3E8] hover:text-white hover:bg-[#3B3B88] transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        ) : !effectiveCollapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#383882] bg-[#32327D] text-[#C5C3E8] hover:text-white hover:bg-[#3B3B88] transition-colors"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Expand trigger when collapsed on desktop */}
      {!isMobile && effectiveCollapsed && (
        <div className="flex justify-center py-2 border-b border-[#383882]">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#383882] bg-[#32327D] text-[#C5C3E8] hover:text-white hover:bg-[#3B3B88] transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Primary Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1.5 scrollbar-none flex flex-col">
        {isSuperAdminUser ? (
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#ABA8D8]">
              Platform Administration
            </div>
            {superAdminStandaloneItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => {
                    if (isMobile) onClose?.();
                  }}
                  title={effectiveCollapsed ? item.title : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-[#3B3B8B] text-white font-bold shadow-xs border border-[#5050A6]"
                      : "text-[#C5C3E8] hover:bg-[#32327D] hover:text-white border border-transparent",
                    effectiveCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[17px] w-[17px] shrink-0 transition-colors",
                      isActive ? "text-white" : "text-[#ABA8D8] group-hover:text-white"
                    )}
                  />
                  {!effectiveCollapsed && <span className="truncate">{item.title}</span>}
                </Link>
              );
            })}
          </div>
        ) : (
          <>
            {/* 1. Top Standalone Items (Dashboard, Services, WhatsApp Automation, Reports) */}
            {topStandaloneItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => {
                    if (isMobile) onClose?.();
                  }}
                  title={effectiveCollapsed ? item.title : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-[#3B3B8B] text-white font-bold shadow-xs border border-[#5050A6]"
                      : "text-[#C5C3E8] hover:bg-[#32327D] hover:text-white border border-transparent",
                    effectiveCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[17px] w-[17px] shrink-0 transition-colors",
                      isActive ? "text-white" : "text-[#ABA8D8] group-hover:text-white"
                    )}
                  />
                  {!effectiveCollapsed && <span className="truncate">{item.title}</span>}
                </Link>
              );
            })}

            {/* 2. Categorized Dropdown Groups */}
            {navGroups.map((group) => {
              const visibleItems = filterSubItems(group.items);
              if (visibleItems.length === 0) return null;

              const GroupIcon = group.icon;
              const isOpen = !!openGroups[group.id];
              const hasActiveChild = isGroupActive(group);

              // In Collapsed Mode: Render as Radix Dropdown Popover
              if (effectiveCollapsed) {
                return (
                  <div key={group.id} className="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          title={group.title}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl transition-all border",
                            hasActiveChild
                              ? "bg-[#3B3B8B] text-white border-[#5050A6] shadow-xs"
                              : "text-[#C5C3E8] hover:bg-[#32327D] hover:text-white border-transparent"
                          )}
                        >
                          <GroupIcon
                            className={cn(
                              "h-[18px] w-[18px]",
                              hasActiveChild ? "text-white" : "text-[#ABA8D8]"
                            )}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={12}
                        className="w-52 p-1.5 rounded-xl border border-[#383882] bg-[#272769] text-white shadow-xl z-50 animate-in fade-in-50 zoom-in-95 duration-150"
                      >
                        <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#ABA8D8]">
                          {group.title}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[#383882] my-1" />
                        {visibleItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive =
                            pathname === sub.href ||
                            (sub.href !== "/dashboard" && pathname.startsWith(sub.href));
                          const badgeVal = getBadgeValue(sub.badge);

                          return (
                            <DropdownMenuItem key={sub.href} asChild>
                              <Link
                                to={sub.href}
                                className={cn(
                                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                                  isSubActive
                                    ? "bg-[#3B3B8B] text-white font-bold"
                                    : "text-[#C5C3E8] hover:bg-[#32327D] hover:text-white"
                                )}
                              >
                                <SubIcon
                                  className={cn(
                                    "h-4 w-4",
                                    isSubActive ? "text-white" : "text-[#ABA8D8]"
                                  )}
                                />
                                <span className="flex-1 truncate">{sub.title}</span>
                                {badgeVal !== undefined && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white text-[#272769]">
                                    {badgeVal}
                                  </span>
                                )}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              }

              // In Expanded Mode: Render as Clean Accordion Dropdown
              return (
                <div key={group.id} className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all group",
                      hasActiveChild
                        ? "text-white bg-[#32327D]/70 font-semibold border border-[#3E3E8E]/40"
                        : "text-[#C5C3E8] hover:bg-[#32327D] hover:text-white border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GroupIcon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          hasActiveChild
                            ? "text-white"
                            : "text-[#ABA8D8] group-hover:text-white"
                        )}
                      />
                      <span className="truncate tracking-tight">{group.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-[#ABA8D8] transition-transform duration-200 shrink-0",
                        isOpen && "rotate-180 text-white"
                      )}
                    />
                  </button>

                  {/* Sub-items list */}
                  {isOpen && (
                    <div className="ml-4 pl-2.5 my-1 border-l border-[#383882] space-y-0.5 transition-all">
                      {visibleItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive =
                          pathname === sub.href ||
                          (sub.href !== "/dashboard" && pathname.startsWith(sub.href));
                        const badgeVal = getBadgeValue(sub.badge);

                        return (
                          <Link
                            key={sub.href}
                            to={sub.href}
                            onClick={() => {
                              if (isMobile) onClose?.();
                            }}
                            className={cn(
                              "group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12.5px] transition-all duration-150",
                              isSubActive
                                ? "bg-[#3B3B8B] text-white font-bold border border-[#5050A6] shadow-2xs"
                                : "text-[#C5C3E8] hover:bg-[#32327D] hover:text-white font-medium border border-transparent"
                            )}
                          >
                            <SubIcon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-colors",
                                isSubActive
                                  ? "text-white"
                                  : "text-[#ABA8D8] group-hover:text-white"
                              )}
                            />
                            <span className="truncate flex-1">{sub.title}</span>
                            {badgeVal !== undefined && (
                              <span
                                className={cn(
                                  "ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-normal",
                                  isSubActive
                                    ? "bg-white text-[#272769]"
                                    : "bg-[#3A3A8A] text-white"
                                )}
                              >
                                {badgeVal}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* 3. Bottom Standalone Items (Notifications & Settings) */}
        <div className="pt-2 mt-auto border-t border-[#383882]/80 space-y-1">
          {bottomStandaloneItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const badgeVal = getBadgeValue(item.badge);

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => {
                  if (isMobile) onClose?.();
                }}
                title={effectiveCollapsed ? item.title : undefined}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#3B3B8B] text-white font-bold shadow-xs border border-[#5050A6]"
                    : "text-[#C5C3E8] hover:bg-[#32327D] hover:text-white border border-transparent",
                  effectiveCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                )}
              >
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] shrink-0 transition-colors",
                    isActive ? "text-white" : "text-[#ABA8D8] group-hover:text-white"
                  )}
                />
                {!effectiveCollapsed && <span className="truncate flex-1">{item.title}</span>}
                {!effectiveCollapsed && badgeVal !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-normal",
                      isActive ? "bg-white text-[#272769]" : "bg-[#3A3A8A] text-white"
                    )}
                  >
                    {badgeVal}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 4. User Profile Card & Dropdown Menu at Bottom */}
      <div className="p-2.5 border-t border-[#383882] bg-[#1E1E55]/95">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2.5 rounded-xl p-2 bg-[#25256E] hover:bg-[#2F2F7E] border border-[#383882] transition-all shadow-2xs text-left group cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20",
                effectiveCollapsed && "justify-center p-1.5"
              )}
              title={effectiveCollapsed ? currentUser?.full_name || "User Profile" : undefined}
            >
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#272769] text-xs font-bold shadow-xs select-none">
                <span>{initials}</span>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#25256E]"
                  title="Active Session"
                />
              </div>

              {!effectiveCollapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate leading-tight group-hover:text-[#E3E2F5] transition-colors">
                        {currentUser?.full_name || "Firm Owner"}
                      </p>
                      {isSuperAdminUser && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-[#3B3B88] text-white border border-[#5050A6]">
                          Root
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#ABA8D8] truncate mt-0.5 leading-tight font-medium">
                      {currentUser?.designation_name
                        ? currentUser.designation_name
                        : formatRoleName(currentUser?.role_code, isSuperAdminUser)}
                      {isEmployee ? " • View Only" : ""}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-[#ABA8D8] group-hover:text-white shrink-0 transition-transform duration-150" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={effectiveCollapsed ? "right" : "top"}
            align={effectiveCollapsed ? "end" : "start"}
            sideOffset={8}
            className="w-60 p-1.5 rounded-2xl border border-[#E6E4F0] bg-white text-[#1E1E4F] shadow-xl z-50"
          >
            <DropdownMenuLabel className="px-3 py-2 text-xs font-normal text-[#55557A]">
              <div className="font-bold text-sm text-[#1E1E4F] truncate">
                {currentUser?.full_name || "Firm Owner"}
              </div>
              <div className="text-[11px] text-[#55557A] truncate mt-0.5 font-medium">
                {currentUser?.email || "owner@auditone.com"}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E3E2F5] border border-[#c7c5ec] text-[#272769]">
                <ShieldCheck className="h-3 w-3 text-[#272769]" />
                {formatRoleName(currentUser?.role_code, isSuperAdminUser)}
                {isEmployee ? " (View Only)" : ""}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#E6E4F0]" />

            {currentUser?.id && (
              <DropdownMenuItem
                asChild
                className="rounded-xl cursor-pointer text-xs font-medium text-[#1E1E4F] hover:bg-[#F6F5FB] hover:text-[#272769] focus:bg-[#F6F5FB] focus:text-[#272769]"
              >
                <Link
                  to={`/employees/${currentUser.id}`}
                  onClick={() => {
                    if (isMobile) onClose?.();
                  }}
                >
                  <User className="mr-2 h-4 w-4 text-[#55557A]" />
                  <span>My Directory Profile</span>
                </Link>
              </DropdownMenuItem>
            )}

            {!isEmployee && (
              <DropdownMenuItem
                asChild
                className="rounded-xl cursor-pointer text-xs font-medium text-[#1E1E4F] hover:bg-[#F6F5FB] hover:text-[#272769] focus:bg-[#F6F5FB] focus:text-[#272769]"
              >
                <Link
                  to="/settings"
                  onClick={() => {
                    if (isMobile) onClose?.();
                  }}
                >
                  <Settings className="mr-2 h-4 w-4 text-[#55557A]" />
                  <span>System Settings</span>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator className="bg-[#E6E4F0]" />

            <DropdownMenuItem
              asChild
              className="rounded-xl cursor-pointer text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 focus:bg-rose-50 focus:text-rose-700"
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
