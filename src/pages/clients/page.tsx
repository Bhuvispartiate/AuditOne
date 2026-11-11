import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users2,
  Plus,
  Search,
  Download,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { pmsStore } from "@/lib/data/store";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

export default function ClientsListPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [, setTick] = useState(0);
  const [search, setSearch] = useState(initialSearch);
  const [constitutionFilter, setConstitutionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    const querySearch = searchParams.get("search");
    if (querySearch !== null) {
      setSearch(querySearch);
    }
  }, [searchParams]);

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
        <div className="flex flex-wrap items-center gap-2">
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
                className="h-10 rounded-2xl border border-slate-300 bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
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

      {/* Box View Only */}
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {filteredClients.map((client) => {
            const isActive = client.status === "Active";

            return (
              <Card
                key={client.id}
                className="group rounded-2xl border-[1.5px] border-slate-300 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-neutral-900 hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all duration-200"
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Top Row: Avatar, Name/Code & Status Pill */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-[#eef2ff] text-[#4f46e5] flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(client.client_name, "CL")}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/clients/${client.id}`}
                          className="text-[14px] font-bold text-[#111827] hover:text-[#4f46e5] transition-colors leading-snug block truncate"
                        >
                          {client.client_name}
                        </Link>
                        <p className="text-[11px] font-mono text-[#6b7280] mt-0.5 leading-snug break-words">
                          {client.client_code} · <span className="font-sans">{client.constitution}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        isActive
                          ? "bg-[#e9f7d9] text-[#2f6f1e]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  {/* Full-width Action Button */}
                  <Link to={`/clients/${client.id}`} className="block">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 rounded-xl border-slate-300 bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold shadow-none"
                    >
                      Open 360° Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
