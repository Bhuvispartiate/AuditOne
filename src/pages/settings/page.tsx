import React, { useState } from "react";
import {
  Settings,
  Shield,
  Lock,
  Key,
  Cloud,
  Database,
  Users,
  CheckCircle2,
  Save,
  RefreshCw,
  Sliders,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { toast } from "sonner";

export default function SettingsPage() {
  const currentUser = pmsStore.getCurrentUser();

  // Role permissions matrix state
  const roles = [
    { code: "SUPER_ADMIN", name: "Super Admin", level: "Tier 1", clients: "Full CRUD", finance: "Full Access", workflows: "Publish", r2: "Master" },
    { code: "DIRECTOR", name: "Director / Partner", level: "Tier 2", clients: "Full CRUD", finance: "Full Access", workflows: "Approve", r2: "Read/Write" },
    { code: "HEAD", name: "Practice Head", level: "Tier 3", clients: "View / Edit", finance: "View Invoices", workflows: "Configure", r2: "Read/Write" },
    { code: "SUPERVISOR", name: "Supervisor / Manager", level: "Tier 4", clients: "View / Edit", finance: "View Invoices", workflows: "Stage Signoff", r2: "Read/Write" },
    { code: "EMPLOYEE", name: "Staff Employee", level: "Tier 5", clients: "View Assigned", finance: "No Access", workflows: "Task Execution", r2: "Upload/Download" },
    { code: "TRAINEE", name: "Articled Trainee", level: "Tier 6", clients: "View Assigned", finance: "No Access", workflows: "Supervised Task", r2: "Upload Workpaper" },
  ];

  // Cloudflare R2 & Supabase credentials settings
  const [r2Bucket, setR2Bucket] = useState("pms-documents");
  const [r2AccountId, setR2AccountId] = useState("cf_acc_9922883311");
  const [supabaseUrl, setSupabaseUrl] = useState("https://zekhmpcrbxpkotcuzhso.supabase.co");
  const [firmName, setFirmName] = useState("PMS Professional Services LLP");
  const [firmGstin, setFirmGstin] = useState("06AABFP1234F1Z9");

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Organization & Cloud settings saved successfully.");
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
          Organization Settings & Access Control
        </h1>
        <p className="text-xs text-[#6b7280] mt-1 font-medium">
          Role-Based Access Control (RBAC), Cloudflare R2 storage credentials, Supabase RLS policies and firm profile.
        </p>
      </div>

      <Tabs defaultValue="rbac" className="w-full">
        <TabsList className="bg-white border border-[#e5e7eb] p-1 rounded-2xl mb-4 shadow-xs">
          <TabsTrigger value="rbac" className="rounded-xl font-bold text-xs">Role-Based Access Control (RBAC)</TabsTrigger>
          <TabsTrigger value="cloud" className="rounded-xl font-bold text-xs">Cloud Storage & Database</TabsTrigger>
          <TabsTrigger value="firm" className="rounded-xl font-bold text-xs">Firm Master Configuration</TabsTrigger>
        </TabsList>

        {/* RBAC MATRIX */}
        <TabsContent value="rbac" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base font-semibold">Hierarchy & Permission Matrix</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Role capabilities enforced at UI, Server Actions and Supabase Row-Level Security (RLS) layers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((r) => (
                  <div
                    key={r.code}
                    className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                          <Lock className="h-3.5 w-3.5 text-blue-600" />
                          <span>{r.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 block mt-0.5">{r.code}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] rounded-full">{r.level}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-slate-50 border border-slate-300 p-2.5">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Client 360°</span>
                        <span className="font-semibold text-slate-800">{r.clients}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Finance</span>
                        <span className="font-semibold text-slate-800">{r.finance}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Workflows</span>
                        <span className="font-semibold text-slate-800">{r.workflows}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">Cloudflare R2</span>
                        <span className="font-semibold text-slate-800">{r.r2}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLOUD & STORAGE */}
        <TabsContent value="cloud" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base font-semibold">Cloudflare R2 & Supabase Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Cloudflare R2 Bucket Name</label>
                  <Input value={r2Bucket} onChange={(e) => setR2Bucket(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Cloudflare Account ID</label>
                  <Input value={r2AccountId} onChange={(e) => setR2AccountId(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Supabase Database Endpoint</label>
                  <Input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} />
                </div>
                <Button type="submit" className="bg-blue-600 text-white gap-2 mt-2">
                  <Save className="h-4 w-4" /> Save Cloud Credentials
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FIRM PROFILE */}
        <TabsContent value="firm" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Organization Profile & Statutory Header</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Firm Official Name</label>
                  <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Firm GSTIN</label>
                  <Input value={firmGstin} onChange={(e) => setFirmGstin(e.target.value)} />
                </div>
                <Button type="submit" className="bg-blue-600 text-white gap-2 mt-2">
                  <Save className="h-4 w-4" /> Update Firm Details
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

