import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { pmsStore } from "@/lib/data/store";
import { isEmployeeRestricted } from "@/lib/access";
import { createClient } from "@/lib/supabase/client";

import LoginPage from "@/pages/login/page";
import AuthCallbackPage from "@/pages/auth/callback/page";
import DashboardPage from "@/pages/dashboard/page";
import ClientsPage from "@/pages/clients/page";
import NewClientPage from "@/pages/clients/new/page";
import Client360ProfilePage from "@/pages/clients/[id]/page";
import ServicesPage from "@/pages/services/page";
import ProjectsPage from "@/pages/projects/page";
import NewProjectPage from "@/pages/projects/new/page";
import ProjectDetailPage from "@/pages/projects/[id]/page";
import TasksPage from "@/pages/tasks/page";
import WorkflowsPage from "@/pages/workflows/page";
import WorkflowKanbanPage from "@/pages/workflows/[id]/page";
import FinancePage from "@/pages/finance/page";
import InvoicesPage from "@/pages/invoices/page";
import NewInvoicePage from "@/pages/invoices/new/page";
import InvoiceDetailsPage from "@/pages/invoices/[id]/page";
import EmployeesPage from "@/pages/employees/page";
import NewEmployeePage from "@/pages/employees/new/page";
import EmployeeProfilePage from "@/pages/employees/[id]/page";
import AttendancePage from "@/pages/attendance/page";
import TeamsPage from "@/pages/teams/page";
import DocumentsPage from "@/pages/documents/page";
import NotificationsPage from "@/pages/notifications/page";
import ReportsPage from "@/pages/reports/page";
import SettingsPage from "@/pages/settings/page";

function isAllowedForEmployee(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/auth/callback" ||
    pathname === "/dashboard" ||
    pathname === "/tasks" ||
    pathname === "/attendance" ||
    pathname === "/documents"
  ) {
    return true;
  }
  if (pathname === "/clients" || (pathname.startsWith("/clients/") && pathname !== "/clients/new")) {
    return true;
  }
  if (pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new")) {
    return true;
  }
  if (pathname === "/workflows" || pathname.startsWith("/workflows/")) {
    return true;
  }
  return false;
}

function EmployeeRouteGuard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [, setTick] = useState(0);

  useEffect(() => {
    return pmsStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const isAuthRoute = pathname === "/login" || pathname.startsWith("/auth");
  const isAuthenticated = pmsStore.isAuthenticated();

  if (!isAuthenticated && !isAuthRoute) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && pathname === "/login") {
    return <Navigate to="/dashboard" replace />;
  }

  const currentUser = pmsStore.getCurrentUser();
  if (isAuthenticated && isEmployeeRestricted(currentUser) && !isAllowedForEmployee(pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function SupabaseAuthListener() {
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      if (email) {
        const fullName =
          (data.session?.user?.user_metadata?.full_name as string | undefined) ||
          (data.session?.user?.user_metadata?.name as string | undefined);
        pmsStore.signInWithEmail(email, fullName);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user?.email) {
        const fullName =
          (session.user.user_metadata?.full_name as string | undefined) ||
          (session.user.user_metadata?.name as string | undefined);
        pmsStore.signInWithEmail(session.user.email, fullName);
      } else if (event === "SIGNED_OUT") {
        pmsStore.signOut();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SupabaseAuthListener />
      <AppShell>
        <EmployeeRouteGuard>
          <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/new" element={<NewClientPage />} />
          <Route path="/clients/:id" element={<Client360ProfilePage />} />

          <Route path="/services" element={<ServicesPage />} />

          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />

          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/workflows/:id" element={<WorkflowKanbanPage />} />
          <Route path="/finance" element={<FinancePage />} />

          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<NewInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />

          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/new" element={<NewEmployeePage />} />
          <Route path="/employees/:id" element={<EmployeeProfilePage />} />
          <Route path="/attendance" element={<AttendancePage />} />

          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </EmployeeRouteGuard>
      </AppShell>
    </BrowserRouter>
  );
}

