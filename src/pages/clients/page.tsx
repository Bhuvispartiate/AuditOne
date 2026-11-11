import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users2,
  Plus,
  Search,
  Filter,
  Eye,
  FileSpreadsheet,
  Download,
  Building,
  Phone,
  Mail,
  MoreVertical,
  CheckCircle2,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ClientsListPage() {
  const [search, setSearch] = useState("");
  const [constitutionFilter, setConstitutionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const allClients = pmsStore.getClients();

  const filteredClients = allClients.filter((c) => {
    const matchesSearch =
      c.client_name.toLowerCase().includes(search.toLowerCase()) ||
      c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
      c.client_code.toLowerCase().includes(search.toLowerCase()) ||
      (c.registration?.pan && c.registration.pan.toLowerCase().includes(search.toLowerCase())) ||
      (c.registration?.gstin && c.registration.gstin.toLowerCase().includes(search.toLowerCase()));

    const matchesConst =
      constitutionFilter === "ALL" || c.constitution === constitutionFilter;

    const matchesStatus =
      statusFilter === "ALL" || c.status === statusFilter;

    return matchesSearch && matchesConst && matchesStatus;
  });

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const exportData = filteredClients.map((c) => ({
      "Client ID": c.client_code,
      "Client Name": c.client_name,
      "Legal Name": c.legal_name,
      Constitution: c.constitution,
      Category: c.category || "—",
      PAN: c.registration?.pan || "—",
      GSTIN: c.registration?.gstin || "—",
      "Relationship Manager": c.relationship_manager_name || "—",
      Status: c.status,
      "Total Invoiced (₹)": c.total_invoiced_amount || 0,
      "Total Collected (₹)": c.total_payments_received || 0,
      "Outstanding (₹)": c.outstanding_amount || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients Master");
    XLSX.writeFile(wb, `PMS_Clients_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Client directory exported to Excel.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Client 360° Master Directory
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Central repository of corporate and individual client engagements, registrations and accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            className="border-[#e5e7eb] rounded-2xl gap-1.5 shadow-xs font-bold"
          >
            <Download className="h-4 w-4 text-[#6b7280]" />
            <span>Export Excel</span>
          </Button>
          <Link to="/clients/new">
            <Button size="sm" className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold">
              <Plus className="h-4 w-4" />
              <span>Onboard New Client</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
              <Input
                type="search"
                placeholder="Search by client name, ID, PAN, GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-2xl border-[#e5e7eb] text-xs font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={constitutionFilter}
                onChange={(e) => setConstitutionFilter(e.target.value)}
                className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
              >
                <option value="ALL">All Constitutions</option>
                <option value="Private Limited">Private Limited</option>
                <option value="Public Limited">Public Limited</option>
                <option value="LLP">LLP</option>
                <option value="Partnership">Partnership</option>
                <option value="Proprietorship">Proprietorship</option>
                <option value="Individual">Individual</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Hold">On Hold</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px] overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-[#f3f4f6] flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-[#111827]">
            Registered Clients ({filteredClients.length})
          </CardTitle>
          <span className="text-xs text-[#9ca3af]">
            Showing all verified client master records
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Client ID</TableHead>
                <TableHead>Client & Legal Name</TableHead>
                <TableHead>Constitution</TableHead>
                <TableHead>PAN / GSTIN</TableHead>
                <TableHead>Relationship Mgr</TableHead>
                <TableHead className="text-right">Total Invoiced</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-[#9ca3af] text-xs">
                    No clients found matching the current search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-[#f9fafb]">
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-[#111827] bg-[#f3f4f6] px-2 py-0.5 rounded-lg">
                        {client.client_code}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/clients/${client.id}`}
                        className="font-bold text-[#111827] hover:text-[#84cc16] block text-xs leading-tight transition-colors"
                      >
                        {client.client_name}
                      </Link>
                      <span className="text-[11px] text-[#9ca3af] block mt-0.5 truncate max-w-xs">
                        {client.legal_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-semibold rounded-full">
                        {client.constitution}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <div className="font-semibold text-[#111827]">{client.registration?.pan || "—"}</div>
                      <div className="text-[#9ca3af] text-[10px]">
                        {client.registration?.gstin || "No GST"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#6b7280]">
                      {client.relationship_manager_name || "Unassigned"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold text-[#111827]">
                      {formatCurrency(client.total_invoiced_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-[#f97316]">
                      {formatCurrency(client.outstanding_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.status === "Active" ? "lime" : "secondary"}
                        className="text-[10px] rounded-full"
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/clients/${client.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-xl text-xs font-bold text-[#111827] hover:bg-[#f3f4f6]">
                          <Eye className="h-3.5 w-3.5" />
                          <span>360° Profile</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

