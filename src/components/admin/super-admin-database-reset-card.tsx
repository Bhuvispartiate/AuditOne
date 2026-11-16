import React, { useState } from "react";
import {
  AlertTriangle,
  Database,
  Trash2,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { isSuperAdmin } from "@/lib/access";
import { toast } from "sonner";

interface SuperAdminDatabaseResetCardProps {
  className?: string;
  variant?: "banner" | "card";
}

export function SuperAdminDatabaseResetCard({
  className = "",
  variant = "card",
}: SuperAdminDatabaseResetCardProps) {
  const currentUser = pmsStore.getCurrentUser();
  const isSuper = isSuperAdmin(currentUser);

  // Security guard: If user is not Super Admin, strictly render nothing
  if (!isSuper) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const REQUIRED_CONFIRM_PHRASE = "RESET DATABASE";
  const isConfirmed = confirmText.trim() === REQUIRED_CONFIRM_PHRASE;

  const handleReset = async () => {
    if (!isConfirmed || isResetting) return;

    setIsResetting(true);
    const toastId = toast.loading("Executing direct Supabase full database wipe...");

    try {
      const result = await pmsStore.resetFullDatabase();

      if (result.ok) {
        toast.success(
          "Supabase database has been completely reset. Clean production baseline re-established.",
          { id: toastId, duration: 6000 }
        );
        setIsOpen(false);
        setConfirmText("");
      } else {
        toast.error(`Database reset failed: ${result.error || "Unknown error"}`, {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(`Reset error: ${err?.message || "Failed to communicate with Supabase"}`, {
        id: toastId,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <div
        className={`rounded-3xl border border-rose-300/80 bg-linear-to-r from-rose-950/10 via-rose-900/5 to-amber-950/10 p-5 sm:p-6 shadow-sm ${className}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600/15 border border-rose-400/30 text-rose-700">
              <Database className="h-5 w-5 text-rose-700" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-[#201815] tracking-tight">
                  Supabase Cloud Database Reset
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  <ShieldAlert className="h-3 w-3" />
                  Super Admin Only
                </span>
              </div>
              <p className="text-xs text-[#7C746A] max-w-2xl leading-relaxed">
                Permanently wipes all clients, projects, tasks, invoices, payments, workflows,
                and non-admin employee records directly from Supabase PostgreSQL. Restores standard
                default task statuses and document folders while preserving your Super Admin root account.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            <Button
              type="button"
              onClick={() => {
                setConfirmText("");
                setIsOpen(true);
              }}
              className="rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Reset Full Database</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={isOpen} onOpenChange={(open) => !isResetting && setIsOpen(open)}>
        <DialogContent className="max-w-lg p-6 sm:p-7 rounded-[28px] border-[#E2DACD] bg-[#FAF8F5] shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-rose-100 border border-rose-200 text-rose-700 shadow-xs">
              <AlertTriangle className="h-6 w-6 text-rose-700 animate-pulse" />
            </div>
            <DialogTitle className="text-lg font-black text-center text-[#201815]">
              Confirm Full Supabase Database Wipe
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-[#7C746A] leading-relaxed">
              This is a permanent, non-reversible action that directly executes on your live
              <strong className="text-[#201815] mx-1">Supabase PostgreSQL</strong> database.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 space-y-2 text-xs text-rose-900">
            <p className="font-bold flex items-center gap-1.5 text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              What will be permanently deleted:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-rose-950">
              <li>All Clients, Client Contacts, Bank Accounts & Addresses</li>
              <li>All Projects, Milestones & Assignments</li>
              <li>All Tasks, Subtasks, Comments & Status History</li>
              <li>All Invoices, Payments, Allocations & Recurring Invoices</li>
              <li>All Services, Engagements & Custom Workflows</li>
              <li>All Vault Credentials, Audit Logs & Recycle Bin items</li>
              <li>All Staff/Employee accounts (Super Admin account is preserved)</li>
            </ul>
          </div>

          <div className="space-y-2 pt-1">
            <Label className="text-xs font-bold text-[#201815]">
              To confirm, type <span className="font-mono font-black text-rose-700 select-all">{REQUIRED_CONFIRM_PHRASE}</span> below:
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type "${REQUIRED_CONFIRM_PHRASE}"`}
              disabled={isResetting}
              className="rounded-xl border-[#E2DACD] bg-white font-mono text-xs focus:border-rose-600 focus:ring-rose-600"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={isResetting}
              onClick={() => setIsOpen(false)}
              className="rounded-2xl border-[#E2DACD] bg-white hover:bg-[#EFE8DC] text-[#201815] font-semibold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isConfirmed || isResetting}
              onClick={handleReset}
              className={`rounded-2xl text-white font-bold text-xs px-5 shadow-sm transition-all flex items-center gap-2 ${
                isConfirmed && !isResetting
                  ? "bg-rose-700 hover:bg-rose-800 cursor-pointer"
                  : "bg-slate-300 cursor-not-allowed opacity-60"
              }`}
            >
              {isResetting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Wiping Supabase...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Confirm Permanent Reset</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

