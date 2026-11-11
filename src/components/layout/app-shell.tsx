import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { pmsStore } from "@/lib/data/store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [, setStoreTick] = useState(0);

  useEffect(() => {
    return pmsStore.subscribe(() => setStoreTick((t) => t + 1));
  }, []);

  const isAuthPage = pathname ? (pathname.startsWith("/login") || pathname.startsWith("/auth")) : false;

  if (isAuthPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#eceefb] flex flex-col justify-center">
          {children}
        </div>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full overflow-hidden bg-[#eceefb] text-[#111827] p-2.5 sm:p-3.5 lg:p-4 gap-3 lg:gap-4 print:h-auto print:overflow-visible print:bg-white print:p-0 print:block">
        <div className="print:hidden flex">
          <AppSidebar />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden bg-white rounded-[26px] border-[1.5px] border-slate-300/90 shadow-[0_8px_32px_rgba(24,25,49,0.05)] print:overflow-visible print:border-0 print:rounded-none print:shadow-none">
          <div className="print:hidden">
            <TopNav />
          </div>
          <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 lg:px-7 lg:py-6 bg-[#fcfcff] print:overflow-visible print:p-0 print:bg-white">
            <div className="mx-auto max-w-[1680px]">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

