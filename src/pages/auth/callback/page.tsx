import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { pmsStore } from "@/lib/data/store";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const completeOAuth = async () => {
      try {
        const supabase = createClient();
        const urlParams = new URLSearchParams(window.location.search);
        const oauthError = urlParams.get("error_description") || urlParams.get("error");
        if (oauthError) {
          if (active) setErrorMsg(oauthError);
          return;
        }

        const code = urlParams.get("code");
        let { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

        if (!sessionData.session && code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          sessionData = { session: exchanged.data.session };
          sessionErr = exchanged.error;
        }

        if (sessionErr) {
          if (active) setErrorMsg(sessionErr.message);
          return;
        }

        const user = sessionData.session?.user;
        if (!user?.email) {
          if (active) {
            setErrorMsg("Google authentication did not return a verified email session.");
          }
          return;
        }

        await pmsStore.hydrateFromSupabase(true);

        const fullName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined);

        const result = pmsStore.signInWithEmail(user.email, fullName);
        if (!result.ok || !result.user) {
          await supabase.auth.signOut();
          if (active) {
            setErrorMsg(result.reason || "Unauthorized Google account.");
          }
          return;
        }

        toast.success(`Signed in with Google as ${result.user.full_name} (${result.user.role_code})`);
        if (active) {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        if (active) {
          setErrorMsg(
            err instanceof Error ? err.message : "Unexpected error completing Google sign-in."
          );
        }
      }
    };

    completeOAuth();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#f4f5f7]">
      <Card className="w-full max-w-md border-[#e5e7eb] shadow-xl bg-white rounded-[24px]">
        <CardHeader className="text-center space-y-1">
          {errorMsg ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-2">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-[#111827]">
                Authentication Blocked
              </CardTitle>
              <CardDescription className="text-xs text-rose-600 font-medium">
                {errorMsg}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 mb-2">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <CardTitle className="text-lg font-bold text-[#111827]">
                Completing Google Sign-In...
              </CardTitle>
              <CardDescription className="text-xs text-[#6b7280]">
                Verifying your Supabase session against the authorized organization directory.
              </CardDescription>
            </>
          )}
        </CardHeader>
        {errorMsg && (
          <CardContent className="pt-2 flex justify-center">
            <Button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

