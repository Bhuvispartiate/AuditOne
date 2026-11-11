import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users2,
  Plus,
  Search,
  Eye,
  Download,
  Building2,
  UserCheck,
  Briefcase,
  LayoutGrid,
  List,
  ArrowUpRight,
  FileCheck2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function ClientsListPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [constitutionFilter, setConstitutionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"box" | "table">("box");

  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch !== null) {
      setSearch(querySearch);
    }
  }, [searchParams]);

  const allClients = pmsStore.getClients();
  const allEngagements = pmsStore.getAllEngagements();

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

      {/* Filter, Search and View Switcher Bar */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
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
            <div className="flex flex-wrap items-center gap-2">
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

              {/* View Mode Switcher */}
              <div className="flex items-center rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("box")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === "box"
                      ? "bg-white text-[#111827] shadow-xs"
                      : "text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Box</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === "table"
                      ? "bg-white text-[#111827] shadow-xs"
                      : "text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>List</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Strip */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Users2 className="h-4 w-4 text-[#6b7280]" />
          <span className="text-sm font-bold text-[#111827]">
            Registered Clients ({filteredClients.length})
          </span>
        </div>
        <span className="text-xs text-[#9ca3af]">
          Showing all verified client master records
        </span>
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 ? (
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardContent className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#9ca3af]">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-[#111827]">No clients found</p>
            <p className="text-xs text-[#6b7280] max-w-sm mx-auto">
              No clients match the current search or filter criteria. Try adjusting filters or onboard a new client.
            </p>
            <div className="pt-2">
              <Link to="/clients/new">
                <Button size="sm" className="bg-neutral-900 hover:bg-black text-white rounded-2xl gap-1.5 font-bold">
                  <Plus className="h-4 w-4" />
                  <span>Onboard New Client</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "box" ? (
        /* Box / Bento Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const activeServicesCount = allEngagements.filter(
              (e) => e.client_id === client.id && e.status === "Active"
            ).length;

            return (
              <Card
                key={client.id}
                className="group rounded-[24px] border border-[#e5e7eb] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_28px_rgba(17,24,39,0.06)] hover:border-neutral-300 transition-all duration-200 flex flex-col justify-between"
              >
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Top Badges Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-[#111827] bg-[#f3f4f6] px-2.5 py-1 rounded-xl">
                        {client.client_code}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-semibold rounded-full px-2.5 py-0.5">
                        {client.constitution}
                      </Badge>
                    </div>
                    <Badge
                      variant={client.status === "Active" ? "lime" : "secondary"}
                      className="text-[10px] rounded-full shrink-0"
                    >
                      {client.status}
                    </Badge>
                  </div>

                  {/* Client Title & Legal Name */}
                  <div>
                    <Link
                      to={`/clients/${client.id}`}
                      className="text-base font-extrabold text-[#111827] group-hover:text-[#65a30d] transition-colors leading-snug block truncate"
                    >
                      {client.client_name}
                    </Link>
                    <p className="text-xs text-[#6b7280] mt-0.5 truncate">
                      {client.legal_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#6b7280] font-medium">
                      <UserCheck className="h-3.5 w-3.5 text-[#9ca3af] shrink-0" />
                      <span className="truncate">
                        RM: <strong className="text-[#111827] font-semibold">{client.relationship_manager_name || "Unassigned"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Registration Identifiers Box */}
                  <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-[#f9fafb] border border-[#f3f4f6] p-3">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                        PAN
                      </span>
                      <span className="font-mono text-xs font-bold text-[#111827] mt-0.5 block truncate">
                        {client.registration?.pan || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                        GSTIN
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#4b5563] mt-0.5 block truncate">
                        {client.registration?.gstin || "No GST"}
                      </span>
                    </div>
                  </div>

                  {/* Financial Summary Row */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="rounded-2xl border border-[#f3f4f6] px-3 py-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                        Total Invoiced
                      </span>
                      <span className="text-sm font-extrabold text-[#111827] mt-0.5 block">
                        {formatCurrency(client.total_invoiced_amount || 0)}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-[#f3f4f6] px-3 py-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                        Outstanding
                      </span>
                      <span
                        className={`text-sm font-extrabold mt-0.5 block ${
                          (client.outstanding_amount || 0) > 0
                            ? "text-[#f97316]"
                            : "text-[#111827]"
                        }`}
                      >
                        {formatCurrency(client.outstanding_amount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Footer Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6]">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6b7280]">
                      {activeServicesCount > 0 ? (
                        <>
                          <Briefcase className="h-3.5 w-3.5 text-[#84cc16]" />
                          <span>{activeServicesCount} Active Service{activeServicesCount > 1 ? "s" : ""}</span>
                        </>
                      ) : (
                        <>
                          <FileCheck2 className="h-3.5 w-3.5 text-[#9ca3af]" />
                          <span className="truncate max-w-[140px]">{client.category || "General Client"}</span>
                        </>
                      )}
                    </div>

                    <Link to={`/clients/${client.id}`}>
                      <Button
                        size="sm"
                        className="h-8 px-3 rounded-xl bg-[#f3f4f6] hover:bg-neutral-900 text-[#111827] hover:text-white text-xs font-bold gap-1.5 transition-colors shadow-none"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>360° Profile</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View (Optional toggle) */
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
                {filteredClients.map((client) => (
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
