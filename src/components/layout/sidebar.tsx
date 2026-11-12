import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Users2,
  Briefcase,
  FolderGit2,
  CheckSquare,
  GitBranch,
  Columns3,
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
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pmsStore } from "@/lib/data/store";
import {
  isEmployeeRestricted,
  isProjectAssignedToEmployee,
  isSuperAdmin,
  isTaskAssignedToEmployee,
  isWorkflowAssignedToEmployee,
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
]);

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
  { title: "Admins", href: "/admins", icon: ShieldCheck, superAdminOnly: true },
  { title: "Attendance", href: "/attendance", icon: MapPin },
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
  const [workflowsOpen, setWorkflowsOpen] = useState(
    Boolean(pathname && pathname.startsWith("/workflows/"))
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    if (pathname && pathname.startsWith("/workflows/")) {
      setWorkflowsOpen(true);
    }
  }, [pathname]);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const isSuperAdminUser = isSuperAdmin(currentUser);
  const employeeId = currentUser?.id || "";
  const projects = pmsStore.getProjects();
  const tasks = pmsStore.getTasks();
  const engagements = pmsStore.getAllEngagements();
  const allWorkflows = pmsStore.getWorkflows().filter((w) => w.is_active !== false);

  const visibleNavItems = isEmployee
    ? mainNavItems.filter((item) => EMPLOYEE_ALLOWED_HREFS.has(item.href))
    : mainNavItems.filter((item) => !item.superAdminOnly || isSuperAdminUser);

  const visibleTasks = isEmployee
    ? tasks.filter((t) => isTaskAssignedToEmployee(t, employeeId))
    : tasks;

  const workflows = isEmployee
    ? allWorkflows.filter((w) =>
        isWorkflowAssignedToEmployee(w, employeeId, projects, tasks, engagements)
      )
    : allWorkflows;

  const assignedProjectClientIds = isEmployee
    ? new Set(
        projects
          .filter((p) => isProjectAssignedToEmployee(p, employeeId, tasks) && p.client_id)
          .map((p) => p.client_id as string)
      )
    : null;

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
              <span className="font-extrabold text-white tracking-tight text-[15px] leading-tight">
                Linear Audit
              </span>
              <span className="text-[10px] font-semibold text-[#8a8fb5] uppercase tracking-widest mt-0.5">
                PMS
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
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isWorkflowRoot = item.href === "/workflows";
          const isActive = pathname
            ? isWorkflowRoot
              ? pathname === "/workflows"
              : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
            : false;
          const taskBadge = item.href === "/tasks" && pendingTasksCount > 0 ? pendingTasksCount : undefined;

          return (
            <React.Fragment key={item.href}>
              <div
                className={cn(
                  "group flex items-center rounded-xl transition-all duration-150 relative",
                  isActive
                    ? "bg-gradient-to-r from-[#6c5ce7] to-[#5b4cdb] text-white font-semibold shadow-[0_6px_18px_rgba(108,92,231,0.38)]"
                    : "text-[#a3a8c3] hover:bg-white/[0.06] hover:text-white font-medium"
                )}
              >
                <Link
                  to={item.href}
                  onClick={() => {
                    if (isWorkflowRoot && workflows.length > 0 && !collapsed) {
                      setWorkflowsOpen(true);
                    }
                  }}
                  className="flex flex-1 min-w-0 items-center gap-3 px-3.5 py-2.5 text-[13px]"
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

                {/* Collapsible Dropdown Toggle for Workflows */}
                {isWorkflowRoot && !collapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setWorkflowsOpen((prev) => !prev);
                    }}
                    title={workflowsOpen ? "Collapse workflows dropdown" : "Expand workflows dropdown"}
                    className={cn(
                      "mr-2 flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-bold transition-colors",
                      isActive
                        ? "text-white hover:bg-white/15"
                        : "text-[#9ca3c0] hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {workflows.length > 0 && (
                      <span
                        className={cn(
                          "flex h-4 min-w-[18px] items-center justify-center rounded-full px-1",
                          isActive ? "bg-white/20 text-white" : "bg-[#2a2d4e] text-[#c7d2fe]"
                        )}
                      >
                        {workflows.length}
                      </span>
                    )}
                    {workflowsOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </button>
                )}
              </div>

              {/* Collapsible Dropdown List of Workflow Pages */}
              {isWorkflowRoot && !collapsed && workflowsOpen && (
                <div className="ml-4 pl-2.5 border-l border-white/12 space-y-0.5 py-1">
                  {workflows.length === 0 ? (
                    <div className="block rounded-lg px-3 py-1.5 text-[11px] text-[#8a8fb5]">
                      {isEmployee ? "No assigned workflows" : (
                        <Link to="/workflows" className="hover:text-white">
                          No workflows yet — Create
                        </Link>
                      )}
                    </div>
                  ) : (
                    workflows.map((wf) => {
                      const wfHref = `/workflows/${wf.id}`;
                      const wfActive = pathname === wfHref;
                      const serviceClientsCount = new Set(
                        engagements
                          .filter(
                            (e) =>
                              e.status === "Active" &&
                              (!assignedProjectClientIds ||
                                e.relationship_manager_id === employeeId ||
                                assignedProjectClientIds.has(e.client_id)) &&
                              ((wf.service_id && e.service_id === wf.service_id) ||
                                (wf.service_name &&
                                  e.service_name?.trim().toLowerCase() === wf.service_name.trim().toLowerCase()))
                          )
                          .map((e) => e.client_id)
                      ).size;

                      return (
                        <Link
                          key={wf.id}
                          to={wfHref}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-150",
                            wfActive
                              ? "bg-gradient-to-r from-[#6c5ce7] to-[#5b4cdb] text-white font-semibold shadow-[0_6px_18px_rgba(108,92,231,0.35)]"
                              : "text-[#a3a8c3] hover:bg-white/[0.06] hover:text-white"
                          )}
                        >
                          <Columns3
                            className={cn(
                              "h-[15px] w-[15px] shrink-0",
                              wfActive ? "text-white" : "text-[#8b5cf6] group-hover:text-white"
                            )}
                          />
                          <span className="truncate flex-1 tracking-tight">{wf.workflow_name}</span>
                          <span
                            className={cn(
                              "ml-auto flex h-4.5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                              wfActive ? "bg-white/20 text-white" : "bg-[#2a2d4e] text-[#c7d2fe]"
                            )}
                          >
                            {serviceClientsCount}
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Utility Navigation (Admin Only) */}
      {!isEmployee && (
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
      )}

      {/* Bottom User Profile Pill (Matching reference image) */}
      <div className="p-3 border-t border-white/[0.07]">
        <Link
          to={isEmployee ? "/dashboard" : "/settings"}
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
                  {isEmployee
                    ? `${currentUser?.designation_name || currentUser?.role_code} • View Only`
                    : currentUser?.designation_name || currentUser?.role_code || "Practice Admin"}
                </p>
              </div>
              {!isEmployee && <ChevronDown className="h-3.5 w-3.5 text-[#8a8fb5] shrink-0" />}
            </>
          )}
        </Link>
      </div>
    </aside>
  );
}
