import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, MessageSquare, Cloud, Check, ArrowRight, ShieldCheck, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: "whatsapp" | "documents" | "reports" | "general";
}

export function UpgradeModal({ open, onOpenChange, feature = "general" }: UpgradeModalProps) {
  const getFeatureDetails = () => {
    switch (feature) {
      case "reports":
        return {
          title: "Reports & Analytics is Closed",
          subtitle: "Upgrade to Access Financial Registers & Executive Analytics",
          description:
            "Automated GST reports, financial ledger exports, multi-format client audit reports, and partner executive summaries are closed on the Free Trial Version. Upgrade your plan to unlock instant Excel/PDF generation and advanced reporting analytics.",
          icon: BarChart3,
          highlight: "Advanced Reporting & Analytics",
        };
      case "whatsapp":
        return {
          title: "WhatsApp Automation is Closed",
          subtitle: "Upgrade to Access Automated Messaging & Client Broadcasts",
          description:
            "The Free Trial Version does not include active WhatsApp automation. Upgrade to the Pro or Enterprise plan to connect your firm's official WhatsApp number, dispatch 1-click statutory reminders, send workflow milestone updates, and track real-time delivery.",
          icon: MessageSquare,
          highlight: "WhatsApp Automation Engine",
        };
      case "documents":
        return {
          title: "Document Storing is Closed",
          subtitle: "Upgrade to Access Cloudflare R2 Encrypted Document Storing",
          description:
            "Document storing and folder creation are closed in the Free Trial Version. Upgrade to unlock unlimited Cloudflare R2 encrypted document storage, client vault archives, audit workpaper attachments, and multi-version history.",
          icon: Cloud,
          highlight: "Encrypted Document Storing",
        };
      default:
        return {
          title: "Upgrade to Access Premium Features",
          subtitle: "Unlock Full Capability for Your Firm",
          description:
            "This feature is closed in the Free Trial Version. Upgrade to an active plan to access automated WhatsApp notifications, unlimited cloud document storing, and advanced audit management tools.",
          icon: Lock,
          highlight: "Full Suite Access",
        };
    }
  };

  const details = getFeatureDetails();
  const IconComponent = details.icon;

  const handleUpgradeClick = () => {
    toast.success("Upgrade request initiated! Our team will contact you shortly to activate your full plan.", {
      duration: 5000,
      description: "You will receive an onboarding email with your license key.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[28px] border border-[#E6E4F0] bg-white p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="text-left space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E3E2F5] text-[#272769] shadow-xs">
              <IconComponent className="h-6 w-6" />
            </div>
            <Badge className="bg-[#E0A95C] text-[#1E1E4F] font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              Free Trial Version
            </Badge>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-extrabold uppercase tracking-wide mb-1.5">
              <Lock className="h-3 w-3" />
              <span>Feature Closed</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-extrabold text-[#1E1E4F] tracking-tight">
              {details.title}
            </DialogTitle>
            <p className="text-xs sm:text-sm font-semibold text-[#272769] mt-0.5">
              {details.subtitle}
            </p>
          </div>

          <DialogDescription className="text-xs sm:text-sm text-[#55557A] leading-relaxed">
            {details.description}
          </DialogDescription>
        </DialogHeader>

        {/* Plan Highlights */}
        <div className="rounded-2xl bg-[#F6F5FB] border border-[#E6E4F0] p-4 space-y-2.5 my-2">
          <span className="text-[11px] font-bold text-[#1E1E4F] uppercase tracking-wider block">
            Included in the Full License:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[#1E1E4F]">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>WhatsApp Automation</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Unlimited Document Storage</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Encrypted Client Vault</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Priority 24/7 Support</span>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
          <div className="flex items-center gap-1 text-[11px] text-[#55557A]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Instant activation available</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-initial h-10 rounded-xl border-[#E6E4F0] text-xs font-bold text-[#55557A] hover:bg-[#F6F5FB]"
            >
              Maybe Later
            </Button>
            <Button
              type="button"
              onClick={handleUpgradeClick}
              className="flex-1 sm:flex-initial h-10 px-5 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-bold gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#E0A95C]" />
              <span>Upgrade to Access</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
