import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  Plus,
  LogOut,
  Settings,
  User,
  Calendar,
  Eye,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { isEmployeeRestricted } from "@/lib/access";
import { createClient } from "@/lib/supabase/client";
import { QuickCreateModal } from "@/components/layout/quick-create-modal";
import { formatDateTime } from "@/lib/utils";

export interface TopNavProps {
  onOpenMobileMenu?: () => void;
}

export function TopNav({ onOpenMobileMenu }: TopNavProps = {}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const notifications = pmsStore.getNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setMobileSearchOpen(false);
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
      <header className="sticky top-0 z-20 flex h-16 sm:h-[68px] w-full items-center justify-between border-b border-[#E2DACD] bg-[#F7F3EB]/95 px-3.5 sm:px-5 lg:px-7 backdrop-blur-md">
        {/* Left: Mobile Hamburger Button & Brand */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E2DACD] bg-[#FAF8F5] text-[#201815] hover:bg-[#EFE8DC] shadow-2xs transition-all"
            aria-label="Open Navigation Menu"
            title="Open Menu"
          >
            <Menu className="h-5 w-5 text-[#201815]" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#201815] text-[#FAF8F5] shadow-xs">
              <Zap className="h-4 w-4 fill-[#FAF8F5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[#201815] tracking-tight text-xs sm:text-sm leading-tight">
                Linear Audit
              </span>
              <span className="text-[9px] font-bold text-[#9A97A8] tracking-wider uppercase">
                PMS
              </span>
            </div>
          </Link>
        </div>

        {/* Global Search Bar (Desktop) */}
        <form onSubmit={handleSearch} className="relative w-full max-w-sm hidden md:block ml-4 lg:ml-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8375]" />
          <Input
            type="search"
            placeholder="Quick search clients, PAN, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 pr-4 h-10 w-full bg-[#FAF8F5] border-[#E2DACD] rounded-full focus:bg-white text-xs font-medium placeholder:text-[#8C8375] text-[#201815] shadow-none transition-all focus:border-[#201815] focus:ring-1 focus:ring-[#201815]"
          />
        </form>

        {/* Right Nav Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto">
          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            className="md:hidden flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-[#E2DACD] bg-[#FAF8F5] text-[#201815] hover:bg-[#EFE8DC] transition-all shadow-2xs"
            title="Search"
          >
            {mobileSearchOpen ? <X className="h-4 w-4 text-[#201815]" /> : <Search className="h-4 w-4 text-[#201815]" />}
          </button>
          {isEmployee && (
            <div className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[#E2DACD] bg-[#FAF8F5] text-[#7C746A] text-[11px] font-bold">
              <Eye className="h-3.5 w-3.5" />
              <span>View-Only Mode</span>
            </div>
          )}

          {/* Date Pill matching reference */}
          <div className="hidden lg:flex items-center gap-2 h-10 px-4 rounded-full border border-[#E2DACD] bg-[#FAF8F5] text-xs font-semibold text-[#201815] shadow-2xs">
            <Calendar className="h-3.5 w-3.5 text-[#9A97A8]" />
            <span>
              {new Date().toLocaleDateString("en-GB", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Notifications Icon Button (Admin Only) */}
          {!isEmployee && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E2DACD] bg-[#FAF8F5] text-[#201815] hover:bg-[#EFE8DC] hover:border-[#201815] transition-all shadow-2xs"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-[#9A97A8] ring-2 ring-[#FAF8F5]" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl border-[#E2DACD] bg-[#FAF8F5] shadow-xl">
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
          )}

          {/* Settings Icon Button (Admin Only) */}
          {!isEmployee && (
            <Link to="/settings">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2DACD] bg-[#FAF8F5] text-[#201815] hover:bg-[#EFE8DC] transition-all shadow-2xs"
                title="Settings"
              >
                <Settings className="h-4 w-4 text-[#201815]" />
              </button>
            </Link>
          )}

          {/* User Profile Capsule (Michael Johnson style) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 sm:p-1 sm:pr-3.5 rounded-full border border-[#E2DACD] bg-[#FAF8F5] hover:bg-[#EFE8DC] transition-all shadow-2xs">
                <Avatar className="h-8 w-8 rounded-full border border-[#E2DACD]">
                  <AvatarFallback className="bg-[#201815] text-[#FAF8F5] text-xs font-bold rounded-full">
                    {currentUser?.full_name?.split(" ").map(n => n[0]).join("") || "AD"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-[#201815] leading-none">
                    {currentUser?.full_name || "Michael Johnson"}
                  </div>
                  <div className="text-[10px] text-[#7C746A] font-medium leading-none mt-1">
                    {currentUser?.email || "admin@pms.internal"}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl border-[#E2DACD] bg-[#FAF8F5] shadow-xl">
              <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-[#7C746A]">
                Signed in as{" "}
                <span className="text-[#201815] font-bold block">
                  {currentUser?.role_code}
                  {isEmployee ? " (View Only)" : ""}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E2DACD]" />
              {!isEmployee && (
                <>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-[#201815] hover:bg-[#EFE8DC]">
                    <Link to={`/employees/${currentUser?.id || ""}`}>
                      <User className="mr-2 h-4 w-4 text-[#7C746A]" />
                      <span>My Directory Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-[#201815] hover:bg-[#EFE8DC]">
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4 text-[#7C746A]" />
                      <span>System Permissions</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#E2DACD]" />
                </>
              )}
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium text-rose-600 focus:text-rose-700">
                <Link
                  to="/login"
                  onClick={() => {
                    pmsStore.signOut();
                    createClient().auth.signOut().catch(() => {});
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Create Action Button (Admin Only) */}
          {!isEmployee && (
            <button
              onClick={() => setQuickCreateOpen(true)}
              className="flex items-center justify-center gap-1.5 h-9 w-9 sm:h-10 sm:w-auto sm:px-4 rounded-full bg-[#201815] hover:bg-[#342722] text-[#FAF8F5] text-xs font-bold transition-all shadow-[0_4px_14px_rgba(32,24,21,0.25)] shrink-0"
              title="Quick Action"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Action</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Search Bar Expandable Drawer */}
      {mobileSearchOpen && (
        <div className="md:hidden border-b border-[#E2DACD] bg-[#F7F3EB] px-3.5 py-2.5 animate-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8375]" />
            <Input
              type="search"
              autoFocus
              placeholder="Search clients, PAN, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 h-10 w-full bg-[#FAF8F5] border-[#E2DACD] rounded-full focus:bg-white text-xs font-medium placeholder:text-[#8C8375] text-[#201815]"
            />
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setMobileSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C746A] hover:text-[#201815] p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Quick Create Modal (Admin Only) */}
      {!isEmployee && (
        <QuickCreateModal
          open={quickCreateOpen}
          onOpenChange={setQuickCreateOpen}
        />
      )}
    </>
  );
}
