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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

      {/* Documents Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Document Repository ({filteredDocs.length})
          </CardTitle>
          <span className="text-xs text-slate-500">Secure Cloudflare R2 objects</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name & Object Key</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-slate-50/80">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-900 text-xs block">
                          {doc.file_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 block truncate max-w-sm">
                          r2://{doc.bucket_name}/{doc.r2_object_key}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {doc.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {formatBytes(doc.file_size)}
                  </TableCell>
                  <TableCell className="text-xs font-mono font-semibold">
                    v{doc.version_number}.0
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    {doc.uploaded_by_name}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(doc.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => handleDownload(doc)}
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-600" />
                      <span>Signed URL</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

