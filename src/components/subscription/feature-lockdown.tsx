import React, { useState } from "react";
import { Lock, Sparkles, Cloud, MessageSquare, BarChart3, CheckCircle2, ShieldCheck, ArrowRight, PhoneCall, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UpgradeModal } from "./upgrade-modal";

export interface FeatureLockdownProps {
  feature: "documents" | "whatsapp" | "reports";
  onAlternativeAction?: () => void;
  alternativeActionLabel?: string;
}

export function FeatureLockdown({
  feature,
  onAlternativeAction,
  alternativeActionLabel,
}: FeatureLockdownProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const config =
    feature === "documents"
      ? {
          title: "Document Storing is Closed",
          subtitle: "Upgrade to Access Encrypted Cloudflare R2 Document Storing",
          badge: "Documents Storing Locked",
          description:
            "Cloud document uploads, private R2 vault storage, custom folder hierarchies, and audit workpaper archives are closed on the Free Trial Version. Upgrade your firm's plan to unlock unlimited document storing with automated client folder indexing.",
          icon: Cloud,
          perks: [
            {
              title: "Unlimited Cloud Storage",
              desc: "Store unlimited audit workpapers, tax filings, and client KYC documents in Cloudflare R2.",
            },
            {
              title: "AES-256 Cloud Encryption",
              desc: "Zero-knowledge cryptographic hashing with granular role-based download permissions.",
            },
            {
              title: "Smart Client Folders",
              desc: "Auto-organized directory trees mapped to each client PAN, GSTIN, and financial year.",
            },
            {
              title: "25-Day Recycle Recovery",
              desc: "Accidental deletion protection with full audit trail and immutable security ledger.",
            },
          ],
        }
      : feature === "reports"
      ? {
          title: "Reports & Analytics is Closed",
          subtitle: "Upgrade to Access Automated Financial Registers & Executive Summaries",
          badge: "Reports & Analytics Locked",
          description:
            "Automated GST reports, financial ledger exports, multi-format client audit reports, and partner executive summaries are closed on the Free Trial Version. Upgrade your plan to unlock instant Excel/PDF generation and advanced reporting analytics.",
          icon: BarChart3,
          perks: [
            {
              title: "GST Financial Registers",
              desc: "Export automated GST summaries with taxable values, CGST, SGST, IGST, and filing breakdowns.",
            },
            {
              title: "Client Master Ledger",
              desc: "Complete client ledger exports with lifetime billing, collection status, and outstanding receivables.",
            },
            {
              title: "Executive PDF Exports",
              desc: "1-click professional PDF audit summaries designed for partner review and client presentations.",
            },
            {
              title: "Audit Trail & Compliance",
              desc: "Exportable compliance history logs and statutory milestone performance metrics.",
            },
          ],
        }
      : {
          title: "WhatsApp Automation is Closed",
          subtitle: "Upgrade to Access Automated Messaging & Client Broadcast Sequences",
          badge: "WhatsApp Automation Locked",
          description:
            "Direct automated WhatsApp messaging, statutory filing reminders, automated milestone alerts, and bulk client broadcast sequences are closed on the Free Trial Version. Upgrade to link your firm's official WhatsApp Business number and automate communications.",
          icon: MessageSquare,
          perks: [
            {
              title: "Automated Statutory Reminders",
              desc: "Auto-send GST, TDS, ITR, and ROC advance reminders directly to clients on WhatsApp.",
            },
            {
              title: "Official Number Pairing",
              desc: "Connect your firm's registered WhatsApp business number via simple QR scan.",
            },
            {
              title: "Dynamic Merge Templates",
              desc: "1-click dispatch with automatic client name, fee amount, and task milestone variables.",
            },
            {
              title: "Delivery & Audit Logging",
              desc: "Complete delivery status tracking, read receipts, and permanent compliance audit logs.",
            },
          ],
        };

  const IconComponent = config.icon;

  const handleUpgradeClick = () => {
    setModalOpen(true);
  };

  return (
    <>
      <div className="w-full rounded-[32px] border border-[#E6E4F0] bg-white p-6 sm:p-10 lg:p-12 shadow-[0_12px_36px_rgba(30,30,79,0.06)] flex flex-col items-center text-center">
        {/* Top Badges */}
        <div className="flex items-center gap-2 flex-wrap justify-center mb-6">
          <Badge className="bg-[#E0A95C] text-[#1E1E4F] font-extrabold text-[11px] px-3.5 py-1 rounded-full uppercase tracking-wider">
            Free Trial Version
          </Badge>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-extrabold uppercase tracking-wide">
            <Lock className="h-3.5 w-3.5" />
            <span>{config.badge}</span>
          </span>
        </div>

        {/* Central Icon */}
        <div className="relative mb-6">
          <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-[#272769] text-white shadow-xl">
            <IconComponent className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#E0A95C] text-[#1E1E4F] shadow-md border-2 border-white">
            <Lock className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Headlines */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1E1E4F] tracking-tight max-w-2xl">
          {config.title}
        </h2>
        <p className="text-sm sm:text-base font-bold text-[#272769] mt-2 max-w-xl">
          {config.subtitle}
        </p>
        <p className="text-xs sm:text-sm text-[#55557A] mt-3 max-w-2xl leading-relaxed">
          {config.description}
        </p>

        {/* Feature Perks Grid */}
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-8 mb-8 text-left">
          {config.perks.map((perk, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-[#F6F5FB] border border-[#E6E4F0] flex items-start gap-3 transition-all hover:border-[#272769]/30"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-extrabold text-[#1E1E4F] truncate">
                  {perk.title}
                </h4>
                <p className="text-[11px] sm:text-xs text-[#55557A] mt-0.5 leading-relaxed">
                  {perk.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
          <Button
            type="button"
            onClick={handleUpgradeClick}
            size="lg"
            className="w-full sm:w-auto h-12 px-7 rounded-2xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-sm font-extrabold gap-2.5 shadow-md cursor-pointer transition-all"
          >
            <Sparkles className="h-4 w-4 text-[#E0A95C]" />
            <span>Upgrade to Access</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          {onAlternativeAction && alternativeActionLabel && (
            <Button
              type="button"
              variant="outline"
              onClick={onAlternativeAction}
              size="lg"
              className="w-full sm:w-auto h-12 px-6 rounded-2xl border-[#E6E4F0] bg-white text-xs sm:text-sm font-bold text-[#55557A] hover:bg-[#F6F5FB] hover:text-[#1E1E4F] cursor-pointer"
            >
              {alternativeActionLabel}
            </Button>
          )}
        </div>

        {/* Footer reassurance */}
        <div className="mt-8 pt-6 border-t border-[#E6E4F0] flex items-center justify-center gap-6 text-[11px] text-[#55557A] flex-wrap">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Instant Plan Activation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-[#272769]" />
            <span>support@linear-audit.com</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PhoneCall className="h-4 w-4 text-[#272769]" />
            <span>Priority Enterprise Hotline</span>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        feature={feature}
      />
    </>
  );
}
