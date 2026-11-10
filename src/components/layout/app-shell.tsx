"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname ? (pathname.startsWith("/login") || pathname.startsWith("/auth")) : false;

  if (isAuthPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#f4f5f7] flex flex-col justify-center">
          {children}
        </div>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen w-full overflow-hidden bg-[#f4f5f7] text-[#111827]">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-6">
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

