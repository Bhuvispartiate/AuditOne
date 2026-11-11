import React, { useState } from "react";
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  Tag,
  Percent,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Service } from "@/types";
import { toast } from "sonner";

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const services = pmsStore.getServices();

  // Form State for Adding / Editing Service
  const [serviceCode, setServiceCode] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultFee, setDefaultFee] = useState(10000);
  const [defaultGstRate, setDefaultGstRate] = useState(18);
  const [billingType, setBillingType] = useState<"One-time" | "Recurring">("Recurring");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  const openCreateModal = () => {
    setEditingService(null);
    setServiceCode("");
    setServiceName("");
    setDescription("");
    setDefaultFee(10000);
    setDefaultGstRate(18);
    setBillingType("Recurring");
    setStatus("Active");
    setIsModalOpen(true);
  };

  const openEditModal = (srv: Service) => {
    setEditingService(srv);
    setServiceCode(srv.service_code);
    setServiceName(srv.service_name);
    setDescription(srv.description || "");
    setDefaultFee(srv.default_fee);
    setDefaultGstRate(srv.default_gst_rate);
    setBillingType(srv.billing_type);
    setStatus(srv.status);
    setIsModalOpen(true);
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.service_name.toLowerCase().includes(search.toLowerCase()) ||
      s.service_code.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "ALL" || s.billing_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceCode.trim() || !serviceName.trim()) {
      toast.error("Please provide both Service Code and Service Name.");
      return;
    }

    if (editingService) {
      pmsStore.updateService(editingService.id, {
        service_code: serviceCode.toUpperCase(),
        service_name: serviceName,
        description,
        default_fee: Number(defaultFee),
        default_gst_rate: Number(defaultGstRate),
        billing_type: billingType,
        status,
      });
      toast.success(`Service "${serviceName}" updated.`);
    } else {
      pmsStore.addService({
        service_code: serviceCode.toUpperCase(),
        service_name: serviceName,
        description,
        default_fee: Number(defaultFee),
        default_gst_rate: Number(defaultGstRate),
        billing_type: billingType,
        status,
      });
      toast.success(`Service "${serviceName}" added to catalog.`);
    }

    setIsModalOpen(false);
    setEditingService(null);
    setServiceCode("");
    setServiceName("");
    setDescription("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Professional Service Catalog
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Standard firm deliverables, statutory SAC compliance, default professional fees and GST tax rates.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          size="sm"
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Service</span>
        </Button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider">Total Catalog Offerings</span>
              <div className="text-2xl font-extrabold text-[#111827] mt-0.5">{services.length} Services</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#f3f4f6] text-[#111827]">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider">Recurring Compliance</span>
              <div className="text-2xl font-extrabold text-[#84cc16] mt-0.5">
                {services.filter((s) => s.billing_type === "Recurring").length} Services
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-lime-50 text-[#4d7c0f]">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider">One-Time Advisory</span>
              <div className="text-2xl font-extrabold text-[#f97316] mt-0.5">
                {services.filter((s) => s.billing_type === "One-time").length} Services
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-orange-50 text-[#c2410c]">
              <Tag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Search by service code, title, or scope description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-2xl border-[#e5e7eb] text-xs font-medium"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
          >
            <option value="ALL">All Billing Types</option>
            <option value="Recurring">Recurring (Monthly / Quarterly)</option>
            <option value="One-time">One-Time Engagement</option>
          </select>
        </CardContent>
      </Card>

      {/* Services Master Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Service Code</TableHead>
                <TableHead>Service Name & Description</TableHead>
                <TableHead>Billing Type</TableHead>
                <TableHead className="text-right">Default Fee</TableHead>
                <TableHead className="text-center">GST Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-[#9ca3af]">
                    No services found. Click "Add New Service" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices.map((srv) => (
                  <TableRow key={srv.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-mono text-xs font-bold text-blue-700">
                      {srv.service_code}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-900 block text-sm">
                        {srv.service_name}
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5 line-clamp-1">
                        {srv.description}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={srv.billing_type === "Recurring" ? "info" : "secondary"}>
                        {srv.billing_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(srv.default_fee)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {srv.default_gst_rate}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={srv.status === "Active" ? "success" : "secondary"}>
                        {srv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(srv)}
                        className="h-8 gap-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Service Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingService ? "Edit Service" : "Add Service to Catalog"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define standard deliverables, baseline fees and statutory GST rates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveService} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Service Code</label>
                <Input
                  placeholder="e.g. SRV-FEMA-01"
                  value={serviceCode}
                  onChange={(e) => setServiceCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Billing Type</label>
                <select
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="Recurring">Recurring</option>
                  <option value="One-time">One-time</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Service Name</label>
              <Input
                placeholder="e.g. FEMA FC-GPR Annual Return Filing"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Scope Description</label>
              <Textarea
                placeholder="Detailed scope of services, regulatory provisions and expected deliverables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Default Service Fee (₹)</label>
                <Input
                  type="number"
                  value={defaultFee}
                  onChange={(e) => setDefaultFee(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Default GST Rate (%)</label>
                <Input
                  type="number"
                  value={defaultGstRate}
                  onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingService ? "Update Service" : "Save Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

