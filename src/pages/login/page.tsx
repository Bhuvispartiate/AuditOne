import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) {
        toast.error(`Google Sign-In failed: ${error.message}`);
        setLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start Google sign-in.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#f4f5f7]">
      <div className="w-full max-w-md">
        {/* Brand Header — Linear Audit PMS */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white font-black text-base tracking-tight shadow-md mb-3">
            LA
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#111827]">
            Linear Audit PMS
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
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
<<<<<<< HEAD
              className="w-full h-11 bg-white hover:bg-[#f9fafb] text-[#111827] hover:text-[#111827] border border-[#d1d5db] hover:border-[#9ca3af] rounded-2xl text-sm font-semibold shadow-xs flex items-center justify-center gap-3 transition-all"
=======
              style={{ color: "#1E1E4F" }}
              className="w-full h-12 bg-white hover:bg-[#F6F5FB] !text-[#1E1E4F] border-2 border-[#E6E4F0] rounded-2xl font-bold shadow-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
>>>>>>> d57c431 (Updated project changes)
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
              <span style={{ color: "#1E1E4F" }} className="!text-[#1E1E4F] font-bold text-sm select-none">
                {loading ? "Authenticating with Google..." : "Continue with Google"}
              </span>
            </Button>

          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-0 pb-6 text-center">
            <span className="text-[10px] font-medium text-[#9ca3af]">
              Linear Audit PMS &bull; Supabase RLS &bull; Cloudflare R2 Vault
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

