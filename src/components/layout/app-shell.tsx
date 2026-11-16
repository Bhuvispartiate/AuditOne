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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    return pmsStore.subscribe(() => setStoreTick((t) => t + 1));
  }, []);

  // Automatically close mobile menu when user navigates
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isAuthPage = pathname ? (pathname.startsWith("/login") || pathname.startsWith("/auth")) : false;

  if (isAuthPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#F6F5FB] text-[#1E1E4F] flex flex-col justify-center">
          {children}
        </div>
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F6F5FB] text-[#1E1E4F] p-0 sm:p-2.5 lg:p-4 gap-0 sm:gap-3 lg:gap-4 print:h-auto print:overflow-visible print:bg-white print:p-0 print:block">
        {/* Desktop Sidebar: Visible only on large screens (>=1024px) */}
        <div className="print:hidden hidden lg:flex">
          <AppSidebar />
        </div>

        {/* Mobile Slide-Over Drawer Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-[#1E1E4F]/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation overlay"
            />
            {/* Slide-in sidebar drawer */}
            <div className="relative w-[300px] max-w-[85vw] h-full z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300 ease-out">
              <AppSidebar isMobile onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Application Container */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#F6F5FB] sm:rounded-[32px] border-0 sm:border border-[#E6E4F0] shadow-[0_12px_36px_rgba(30,30,79,0.06)] print:overflow-visible print:border-0 print:rounded-none print:shadow-none min-w-0">
          <div className="print:hidden">
            <TopNav onOpenMobileMenu={() => setMobileMenuOpen(true)} />
          </div>
          <main className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6 bg-[#F6F5FB] print:overflow-visible print:p-0 print:bg-white">
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

