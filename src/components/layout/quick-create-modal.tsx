"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users2,
  FolderGit2,
  CheckSquare,
  Receipt,
  CreditCard,
  UploadCloud,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface QuickCreateModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function QuickCreateModal({ open, isOpen, onClose, onOpenChange }: QuickCreateModalProps) {
  const router = useRouter();
  const isModalOpen = open !== undefined ? open : !!isOpen;
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const actions = [
    {
      title: "Onboard New Client",
      description: "Register basic info, addresses, GST/PAN and assign relationship manager",
      icon: Users2,
      color: "bg-lime-50 text-[#4d7c0f] border-lime-200",
      href: "/clients/new",
    },
    {
      title: "Create Project",
      description: "Start a client or internal project, assign team and establish milestones",
      icon: FolderGit2,
      color: "bg-neutral-100 text-[#111827] border-neutral-200",
      href: "/projects/new",
    },
    {
      title: "Create Task",
      description: "Assign a deliverable with deadline, priority and workflow stage",
      icon: CheckSquare,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      href: "/tasks?create=true",
    },
    {
      title: "Generate GST Invoice",
      description: "Create a compliant GST invoice with automatic tax calculations",
      icon: Receipt,
      color: "bg-amber-50 text-amber-700 border-amber-200",
      href: "/invoices/new",
    },
    {
      title: "Record Payment",
      description: "Log incoming client remittance, mode and allocate to outstanding balance",
      icon: CreditCard,
      color: "bg-lime-100 text-lime-900 border-lime-300",
      href: "/finance?action=record",
    },
    {
      title: "Upload Document to Cloud (R2)",
      description: "Store signed filings, KYC, auditor certs in secure Cloudflare R2 bucket",
      icon: UploadCloud,
      color: "bg-sky-50 text-sky-700 border-sky-200",
      href: "/documents?upload=true",
    },
  ];

  const handleSelect = (href: string) => {
    handleClose();
    router.push(href);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-xl p-6 rounded-[24px] border-[#e5e7eb] shadow-2xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-bold text-[#111827]">
            Quick Actions
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6b7280]">
            Select a business workflow to create or initiate across the organization.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.title}
                onClick={() => handleSelect(act.href)}
                className="group flex flex-col p-4 rounded-2xl border border-[#e5e7eb] hover:border-neutral-900 bg-white hover:bg-[#f9fafb] text-left transition-all duration-150 shadow-xs"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className={`p-2.5 rounded-xl border ${act.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#9ca3af] group-hover:text-[#111827] group-hover:translate-x-0.5 transition-all" />
                </div>
                <h4 className="font-bold text-xs text-[#111827] group-hover:text-black transition-colors">
                  {act.title}
                </h4>
                <p className="text-[11px] text-[#6b7280] mt-1 line-clamp-2 leading-relaxed">
                  {act.description}
                </p>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

