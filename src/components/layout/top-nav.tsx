import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Plus,
  LogOut,
  Settings,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Briefcase,
  Users2,
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { QuickCreateModal } from "@/components/layout/quick-create-modal";
import { formatDateTime } from "@/lib/utils";

export function TopNav() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const currentUser = pmsStore.getCurrentUser();
  const notifications = pmsStore.getNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/clients?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleNotificationClick = (id: string, refType?: string, refId?: string) => {
    pmsStore.markNotificationAsRead(id);
    if (refType === "project" && refId) navigate(`/projects`);
    else if (refType === "task" && refId) navigate(`/tasks`);
    else if (refType === "payment" && refId) navigate(`/finance`);
    else if (refType === "invoice" && refId) navigate(`/invoices`);
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#e5e7eb] bg-[#f4f5f7]/80 px-6 lg:px-8 backdrop-blur-md">
        {/* Global Search Bar — ACRU Style */}
        <form onSubmit={handleSearch} className="relative w-full max-w-sm hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
          <Input
            type="search"
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 h-11 w-full bg-white border-[#e5e7eb] rounded-2xl focus:bg-white text-xs font-medium placeholder:text-[#9ca3af] shadow-xs transition-all focus:ring-1 focus:ring-neutral-400"
          />
        </form>

        {/* Right Nav Utilities Matching Reference Image */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Notifications Icon Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e5e7eb] bg-white text-[#111827] hover:bg-[#f9fafb] transition-all shadow-xs"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border-[#e5e7eb] shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f6]">
                <span className="font-bold text-xs text-[#111827] uppercase tracking-wider">
                  Notifications
                </span>
                <Badge variant="secondary" className="text-[10px] font-semibold bg-neutral-100 text-neutral-800 rounded-full">
                  {unreadCount} unread
                </Badge>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-[#f3f4f6]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#9ca3af]">
                    No unread notifications
                  </div>
                ) : (
                  notifications.slice(0, 6).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id, notif.reference_type, notif.reference_id)}
                      className={`p-3.5 text-left hover:bg-[#f9fafb] cursor-pointer transition-colors ${
                        !notif.is_read ? "bg-neutral-50/80 font-medium" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {!notif.is_read && (
                          <div className="h-2 w-2 rounded-full bg-lime-500 mt-1 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-[#111827] leading-tight">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-[#6b7280] mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-[#9ca3af] mt-1 block">
                            {formatDateTime(notif.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-[#f3f4f6] text-center">
                <Link
                  to="/notifications"
                  className="text-xs font-semibold text-[#111827] hover:text-[#84cc16] transition-colors"
                >
                  View all notifications
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Icon Button */}
          <Link to="/settings">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e5e7eb] bg-white text-[#111827] hover:bg-[#f9fafb] transition-all shadow-xs"
              title="Settings"
            >
              <Settings className="h-4 w-4 text-[#4b5563]" />
            </button>
          </Link>

          {/* User Profile Capsule (Michael Johnson style) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-all shadow-xs">
                <Avatar className="h-8 w-8 rounded-xl border border-neutral-200">
                  <AvatarFallback className="bg-neutral-900 text-white text-xs font-bold rounded-xl">
                    {currentUser?.full_name?.split(" ").map(n => n[0]).join("") || "AD"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-[#111827] leading-none">
                    {currentUser?.full_name || "Michael Johnson"}
                  </div>
                  <div className="text-[10px] text-[#9ca3af] font-medium leading-none mt-1">
                    {currentUser?.email || "admin@pms.internal"}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl border-[#e5e7eb] shadow-xl">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-[#9ca3af]">
                Signed in as <span className="text-[#111827] font-bold block">{currentUser?.role_code}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#f3f4f6]" />
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium">
                <Link to={`/employees/${currentUser?.id || ""}`}>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Directory Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium">
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>System Permissions</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#f3f4f6]" />
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-rose-600 focus:text-rose-700">
                <Link to="/login">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Create Action Button (Add widget style from reference) */}
          <button
            onClick={() => setQuickCreateOpen(true)}
            className="flex items-center gap-1.5 h-11 px-4 rounded-2xl border border-[#e5e7eb] bg-white text-[#111827] hover:bg-[#f9fafb] text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Quick Action</span>
          </button>
        </div>
      </header>

      {/* Quick Create Modal */}
      <QuickCreateModal
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
      />
    </>
  );
}
