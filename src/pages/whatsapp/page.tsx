import React from "react";
import { MessageSquare, Lock, Sparkles } from "lucide-react";
import { FeatureLockdown } from "@/components/subscription/feature-lockdown";
import { Badge } from "@/components/ui/badge";

export default function WhatsAppPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E6E4F0] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1E1E4F]">
              WhatsApp Automation
            </h1>
            <Badge className="bg-[#E0A95C] text-[#1E1E4F] font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
              Free Trial Version
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#55557A] font-medium">
            Automate statutory filing reminders, task milestone alerts, and client broadcast sequences.
          </p>
        </div>
      </div>

      {/* FULL PAGE LOCKDOWN */}
      <FeatureLockdown feature="whatsapp" />
    </div>
  );
}
