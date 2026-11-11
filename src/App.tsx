import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";

import LoginPage from "@/pages/login/page";
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
import FinancePage from "@/pages/finance/page";
import InvoicesPage from "@/pages/invoices/page";
import NewInvoicePage from "@/pages/invoices/new/page";
import InvoiceDetailsPage from "@/pages/invoices/[id]/page";
import EmployeesPage from "@/pages/employees/page";
import NewEmployeePage from "@/pages/employees/new/page";
import EmployeeProfilePage from "@/pages/employees/[id]/page";
import TeamsPage from "@/pages/teams/page";
import DocumentsPage from "@/pages/documents/page";
import NotificationsPage from "@/pages/notifications/page";
import ReportsPage from "@/pages/reports/page";
import SettingsPage from "@/pages/settings/page";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
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
          <Route path="/finance" element={<FinancePage />} />

          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/new" element={<NewInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />

          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/new" element={<NewEmployeePage />} />
          <Route path="/employees/:id" element={<EmployeeProfilePage />} />

          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

