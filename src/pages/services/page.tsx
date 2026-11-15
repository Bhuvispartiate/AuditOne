import React, { useEffect, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Service } from "@/types";
import { toast } from "sonner";

export default function ServicesPage() {
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

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

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceCode.trim() || !serviceName.trim()) {
      toast.error("Please provide both Service Code and Service Name.");
      return;
    }

    try {
      if (editingService) {
        await pmsStore.updateService(editingService.id, {
          service_code: serviceCode.toUpperCase(),
          service_name: serviceName,
          description,
          default_fee: Number(defaultFee),
          default_gst_rate: Number(defaultGstRate),
          billing_type: billingType,
          status,
        });
        toast.success(`Service "${serviceName}" updated in database.`);
      } else {
        await pmsStore.addService({
          service_code: serviceCode.toUpperCase(),
          service_name: serviceName,
          description,
          default_fee: Number(defaultFee),
          default_gst_rate: Number(defaultGstRate),
          billing_type: billingType,
          status,
        });
        toast.success(`Service "${serviceName}" added to Supabase catalog.`);
      }

      setIsModalOpen(false);
      setEditingService(null);
      setServiceCode("");
      setServiceName("");
      setDescription("");
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to save service."}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Professional Service Catalog
          </h1>
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

      {/* Services Box View */}
      {filteredServices.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="py-16 text-center space-y-2">
            <Briefcase className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-[#111827]">No services found</p>
            <p className="text-xs text-[#6b7280]">
              Click &ldquo;Add New Service&rdquo; to create your first professional offering.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredServices.map((srv) => (
            <Card
              key={srv.id}
              className="group rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(17,24,39,0.07)] hover:border-neutral-900 transition-all duration-200 flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {/* Top Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-xl">
                      {srv.service_code}
                    </span>
                    <Badge
                      variant={srv.billing_type === "Recurring" ? "info" : "secondary"}
                      className="text-[10px] font-semibold rounded-full px-2.5 py-0.5"
                    >
                      {srv.billing_type}
                    </Badge>
                  </div>
                  <Badge
                    variant={srv.status === "Active" ? "success" : "secondary"}
                    className="text-[10px] rounded-full shrink-0"
                  >
                    {srv.status}
                  </Badge>
                </div>

                {/* Title & Scope */}
                <div>
                  <h3 className="text-base font-extrabold text-[#111827] leading-snug">
                    {srv.service_name}
                  </h3>
                  <p className="text-xs text-[#6b7280] mt-1 line-clamp-2 leading-relaxed">
                    {srv.description || "No scope description provided."}
                  </p>
                </div>

                {/* Fee & GST Inner Boxes */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-slate-300 bg-slate-50/80 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Default Fee
                    </span>
                    <span className="text-sm font-extrabold text-[#111827] mt-0.5 block">
                      {formatCurrency(srv.default_fee)}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      GST Rate
                    </span>
                    <span className="font-mono text-sm font-extrabold text-[#111827] mt-0.5 block">
                      {srv.default_gst_rate}%
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f3f4f6]">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openEditModal(srv)}
                    className="h-8 px-3.5 rounded-xl bg-[#f3f4f6] hover:bg-neutral-900 text-[#111827] hover:text-white text-xs font-bold gap-1.5 transition-colors shadow-none"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Service</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!window.confirm(`Delete service "${srv.service_name}" from catalog?`)) return;
                      try {
                        await pmsStore.deleteService(srv.id);
                        toast.success(`Deleted service "${srv.service_name}".`);
                      } catch (err: any) {
                        toast.error(`Failed to delete service: ${err.message || err}`);
                      }
                    }}
                    className="h-8 px-2.5 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold gap-1 transition-colors shadow-none"
                    title="Delete Service"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

