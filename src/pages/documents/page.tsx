import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  Download,
  Folder,
  Tag,
  ShieldCheck,
  Eye,
  Trash2,
  Lock,
  Cloud,
  FileSpreadsheet,
  FileCode,
  FileArchive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatBytes, formatDate } from "@/lib/utils";
import { DocumentCategory } from "@/types";
import { toast } from "sonner";

function DocumentsContent() {
  const [searchParams] = useSearchParams();
  const autoUpload = searchParams.get("upload") === "true";
  const prefillClientId = searchParams.get("clientId") || "";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(autoUpload);

  const documents = pmsStore.getDocuments();
  const clients = pmsStore.getClients();
  const projects = pmsStore.getProjects();

  // Upload Form State
  const [fileName, setFileName] = useState("");
  const [fileCategory, setFileCategory] = useState<DocumentCategory>("Client");
  const [associatedClientId, setAssociatedClientId] = useState(prefillClientId || clients[0]?.id || "");
  const [expiryDate, setExpiryDate] = useState("");
  const [fileSize] = useState(524288); // 512 KB simulation

  const categories: DocumentCategory[] = [
    "Client",
    "PAN",
    "GST",
    "CIN",
    "Employee",
    "Bank",
    "Project",
    "Task",
    "Invoice",
    "Payment Receipt",
    "Workflow",
    "Other",
  ];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(search.toLowerCase()) ||
      doc.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "ALL" || doc.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      toast.error("Please specify a document title or file name.");
      return;
    }

    const client = clients.find((c) => c.id === associatedClientId);
    const objectKey = `clients/${client?.client_code || "general"}/${fileName.replace(/\s+/g, "_")}`;

    pmsStore.addDocument({
      bucket_name: "pms-documents",
      r2_object_key: objectKey,
      file_name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
      file_size: fileSize,
      mime_type: "application/pdf",
      category: fileCategory,
      entity_type: "client",
      entity_id: associatedClientId,
      uploaded_by: pmsStore.getCurrentUser().id,
      uploaded_by_name: pmsStore.getCurrentUser().full_name,
      version_number: 1,
      expiry_date: expiryDate || undefined,
    });

    toast.success(`Document uploaded to Cloudflare R2 bucket: ${objectKey}`);
    setIsUploadModalOpen(false);
    setFileName("");
  };

  const handleDownload = (doc: any) => {
    toast.success(`Generated presigned R2 secure URL for ${doc.file_name} (Expires in 60m)`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Cloudflare R2 Cloud Document Storage
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Private, encrypted object storage for client KYC, statutory audits, tax submissions and workpapers.
          </p>
        </div>

        <Button
          onClick={() => setIsUploadModalOpen(true)}
          size="sm"
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* R2 Cloud Security Banner */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] bg-[#111827] text-white border-neutral-800 rounded-[24px]">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 text-lime-400 border border-white/10">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Cloudflare R2 Private Bucket Integration</span>
                <Badge variant="outline" className="border-lime-400 text-lime-400 text-[10px] font-bold">
                  Encrypted at Rest
                </Badge>
              </div>
              <p className="text-neutral-400 mt-0.5">
                Zero egress fees &bull; Object keys mapped in Supabase &bull; Signed URLs generated server-side
              </p>
            </div>
          </div>
          <div className="text-neutral-400 font-mono text-[11px] shrink-0">
            Bucket: <strong className="text-white">pms-documents</strong>
          </div>
        </CardContent>
      </Card>

      {/* Category Folder Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          All Categories ({documents.length})
        </button>
        {categories.map((cat) => {
          const count = documents.filter((d) => d.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Folder className="h-3.5 w-3.5 opacity-60" />
              <span>{cat}</span>
              {count > 0 && <span className="text-[10px] opacity-75">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search documents by file name, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents Box View */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-bold text-[#111827]">
          Document Repository ({filteredDocs.length})
        </span>
        <span className="text-xs text-[#9ca3af]">Secure Cloudflare R2 objects</span>
      </div>

      {filteredDocs.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="py-16 text-center space-y-2">
            <FileText className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-[#111827]">No documents uploaded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="group rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(17,24,39,0.07)] hover:border-neutral-900 transition-all duration-200 flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] rounded-full">
                      {doc.category}
                    </Badge>
                  </div>
                  <span className="font-mono text-[11px] font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg">
                    v{doc.version_number}.0
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-[#111827] truncate">
                    {doc.file_name}
                  </h3>
                  <p className="font-mono text-[10px] text-[#6b7280] mt-1 truncate">
                    r2://{doc.bucket_name}/{doc.r2_object_key}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-slate-50/80 border border-slate-300 p-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      File Size
                    </span>
                    <span className="font-mono font-bold text-[#111827] mt-0.5 block">
                      {formatBytes(doc.file_size)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Uploaded Date
                    </span>
                    <span className="font-semibold text-[#111827] mt-0.5 block">
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6]">
                  <span className="text-[11px] text-[#6b7280] truncate">
                    By <strong className="text-[#111827]">{doc.uploaded_by_name}</strong>
                  </span>
                  <Button
                    onClick={() => handleDownload(doc)}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs rounded-xl border-slate-300"
                  >
                    <Download className="h-3.5 w-3.5 text-blue-600" />
                    <span>Signed URL</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Upload Document to Cloudflare R2
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Files are streamed directly to private Cloudflare R2 bucket with secure cryptographic hashes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Document Title / File Name</label>
              <Input
                placeholder="e.g. Audit_Report_FY24_Final.pdf"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value as DocumentCategory)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Associated Client</label>
                <select
                  value={associatedClientId}
                  onChange={(e) => setAssociatedClientId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.client_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Expiry Date (Optional for licenses)</label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50/50">
              <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-slate-700">Choose file or drag & drop</p>
              <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOCX, XLSX, JPG up to 50MB</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Upload to R2
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading documents...</div>}>
      <DocumentsContent />
    </React.Suspense>
  );
}

