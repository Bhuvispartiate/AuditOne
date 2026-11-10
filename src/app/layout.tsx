import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Professional Service Management System (PMS)",
  description: "Enterprise PMS platform for clients, services, projects, workflows, finance, GST invoicing and cloud documents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-slate-900 bg-slate-50/60">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
