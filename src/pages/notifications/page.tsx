import React, { useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  FolderGit2,
  CheckSquare,
  FileText,
  AlertTriangle,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function NotificationsPage() {
  const notifications = pmsStore.getNotifications();
  const [filter, setFilter] = useState<string>("ALL");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = () => {
    notifications.forEach((n) => pmsStore.markNotificationAsRead(n.id));
    toast.success("All notifications marked as read.");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "payment_received":
        return <CreditCard className="h-4 w-4 text-emerald-600" />;
      case "invoice_generated":
        return <Receipt className="h-4 w-4 text-blue-600" />;
      case "project_created":
        return <FolderGit2 className="h-4 w-4 text-indigo-600" />;
      case "task_assigned":
        return <CheckSquare className="h-4 w-4 text-amber-600" />;
      case "task_deadline":
        return <Clock className="h-4 w-4 text-rose-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.is_read;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Notification Center & Reminders
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Real-time compliance alerts, assignment notices, overdue payments and workflow sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllRead}
              variant="outline"
              size="sm"
              className="border-[#e5e7eb] rounded-2xl gap-1.5 shadow-xs font-bold text-xs"
            >
              <Check className="h-4 w-4 text-[#84cc16]" />
              <span>Mark All as Read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("UNREAD")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filter === "UNREAD"
              ? "bg-blue-600 text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No notifications to display.
            </div>
          ) : (
            filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => pmsStore.markNotificationAsRead(notif.id)}
                className={`p-4 flex items-start gap-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                  !notif.is_read ? "bg-blue-50/30" : ""
                }`}
              >
                <div className="p-2.5 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-900 leading-snug">
                      {notif.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatDateTime(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px] text-slate-500 uppercase font-mono">
                      {notif.type.replace(/_/g, " ")}
                    </Badge>
                    {!notif.is_read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

