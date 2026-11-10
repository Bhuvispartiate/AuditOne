"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("emp-001");
  const employees = pmsStore.getEmployees();

  const handleGoogleLogin = async () => {
    setLoading(true);
    // In production with Supabase configured:
    // const supabase = createClient();
    // await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });

    // Simulate Supabase OAuth + Active Employee Verification
    setTimeout(() => {
      pmsStore.setCurrentUser(selectedEmpId);
      const user = pmsStore.getCurrentUser();

      if (!user.is_active) {
        toast.error("Access Denied: Your employee account has been deactivated.");
        setLoading(false);
        return;
      }

      toast.success(`Welcome back, ${user.full_name}! Signed in as ${user.role_code}`);
      setLoading(false);
      router.push("/dashboard");
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#f4f5f7]">
      <div className="w-full max-w-md">
        {/* Brand Header — ACRU Style */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white font-black text-xl shadow-md mb-3">
            A
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#111827]">
            ACRU PMS
          </h1>
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-widest mt-1">
            Enterprise Professional Services Suite
          </p>
        </div>

        <Card className="border-[#e5e7eb] shadow-xl bg-white rounded-[24px]">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-lg font-bold text-[#111827]">
              Authorized Employee Sign In
            </CardTitle>
            <CardDescription className="text-xs text-[#6b7280]">
              Restricted to verified organization personnel. No public registration.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {/* Google OAuth Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-11 bg-white hover:bg-[#f9fafb] text-[#111827] border border-[#e5e7eb] rounded-2xl font-bold shadow-xs flex items-center justify-center gap-3 transition-all"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? "Authenticating with Google..." : "Continue with Google"}</span>
            </Button>

            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#f3f4f6]" />
              </div>
              <span className="relative bg-white px-3 text-[10px] uppercase font-bold text-[#9ca3af]">
                Or select identity (Dev Role Switcher)
              </span>
            </div>

            {/* Role / Employee Switcher */}
            <div className="space-y-1.5 bg-[#f9fafb] p-3 rounded-2xl border border-[#e5e7eb]">
              <label className="text-xs font-semibold text-[#111827] block">
                Active Organization Profile:
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full h-9 rounded-xl border border-[#e5e7eb] bg-white px-3 text-xs font-medium focus:outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} — {emp.role_code} ({emp.designation_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Security checklist notice */}
            <div className="rounded-2xl bg-neutral-50 p-3 border border-[#e5e7eb] text-xs text-[#111827] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Lock className="h-3.5 w-3.5 text-[#111827]" />
                <span>Zero-Trust Enterprise Access</span>
              </div>
              <p className="text-[11px] text-[#6b7280] leading-relaxed">
                Google OAuth accounts must be pre-registered in the active Employee Directory.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-0 pb-6 text-center">
            <span className="text-[10px] font-medium text-[#9ca3af]">
              ACRU PMS &bull; Supabase RLS &bull; Cloudflare R2 Vault
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

