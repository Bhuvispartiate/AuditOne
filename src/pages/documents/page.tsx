import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
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
  RotateCcw,
  Clock,
  AlertTriangle,
  FolderPlus,
  CheckCircle2,
  X,
  Check,
  Calendar,
  Layers,
  History,
  Info,
  ArchiveRestore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import {
  isEmployeeRestricted,
  isTaskAssignedToEmployee,
  collectTaskIds,
  isProjectAssignedToEmployee,
  isClientAssignedToEmployee,
  isDocumentVisibleToEmployee,
  isAdminUser,
} from "@/lib/access";
import { formatBytes, formatDate } from "@/lib/utils";
import { DocumentCategory, DocumentFolder, FileObject } from "@/types";
import { toast } from "sonner";

// Compute remaining recovery days within the 25-day retention window
function getDaysRemaining(recoveryDeadline?: string, deletedAt?: string): number {
  if (recoveryDeadline) {
    const diffMs = new Date(recoveryDeadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
  if (deletedAt) {
    const expiresAt = new Date(deletedAt).getTime() + 25 * 86400000;
    const diffMs = expiresAt - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
  return 25;
}

function DocumentsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isRecycleBinParam =
    location.pathname === "/recycle-bin" || searchParams.get("tab") === "recycle-bin";
  const [currentTab, setCurrentTab] = useState<"active" | "recycle-bin">(
    isRecycleBinParam ? "recycle-bin" : "active"
  );

  useEffect(() => {
    if (location.pathname === "/recycle-bin" || searchParams.get("tab") === "recycle-bin") {
      setCurrentTab("recycle-bin");
    } else {
      setCurrentTab("active");
    }
  }, [location.pathname, searchParams]);

  const autoUpload = searchParams.get("upload") === "true";
  const prefillClientId = searchParams.get("clientId") || "";

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const canAdminRecycleBin = isAdminUser(currentUser) || !isEmployee;
  const empId = currentUser?.id || "";

  const [tick, setTick] = useState(0);
  void tick;

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("ALL");
  const [recycleBinFilter, setRecycleBinFilter] = useState<"ALL" | "DOCUMENT" | "FOLDER">("ALL");

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(autoUpload && !isEmployee);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  // Soft Delete confirmation modal (Move to Recycle Bin)
  const [softDeleteTarget, setSoftDeleteTarget] = useState<{
    type: "document" | "folder";
    id: string;
    name: string;
  } | null>(null);

  // Permanent Delete Double-Verification Modal
  const [permDeleteTarget, setPermDeleteTarget] = useState<{
    type: "document" | "folder" | "all";
    id?: string;
    name: string;
  } | null>(null);
  const [permDeleteInput, setPermDeleteInput] = useState("");

  const isPermDeleteMatch = Boolean(
    permDeleteTarget &&
      (permDeleteTarget.type === "all"
        ? permDeleteInput.trim().toUpperCase() === "EMPTY RECYCLE BIN"
        : permDeleteInput.trim().toLowerCase() === permDeleteTarget.name.trim().toLowerCase())
  );

  // Data fetching
  const rawDocuments = pmsStore.getDocuments();
  const folders = pmsStore.getDocumentFolders();
  const recycleBin = pmsStore.getRecycleBinItems();

  const allClients = pmsStore.getClients();
  const allProjects = pmsStore.getProjects();
  const allTasks = pmsStore.getTasks();
  const allEngagements = pmsStore.getAllEngagements();

  const assignedTasks = isEmployee
    ? allTasks.filter((t) => isTaskAssignedToEmployee(t, empId))
    : allTasks;
  const projects = isEmployee
    ? allProjects.filter((p) => isProjectAssignedToEmployee(p, empId, allTasks))
    : allProjects;
  const clients = isEmployee
    ? allClients.filter((c) =>
        isClientAssignedToEmployee(c, empId, allProjects, allTasks, allEngagements)
      )
    : allClients;

  const assignedClientIds = new Set(clients.map((c) => c.id));
  const assignedProjectIds = new Set(projects.map((p) => p.id));
  const assignedTaskIds = collectTaskIds(assignedTasks);

  const documents = isEmployee
    ? rawDocuments.filter((doc) =>
        isDocumentVisibleToEmployee(
          doc,
          empId,
          assignedClientIds,
          assignedProjectIds,
          assignedTaskIds
        )
      )
    : rawDocuments;

  // Upload Form State
  const [fileName, setFileName] = useState("");
  const [fileCategory, setFileCategory] = useState<DocumentCategory>("Client");
  const [associatedClientId, setAssociatedClientId] = useState(prefillClientId || clients[0]?.id || "");
  const [associatedFolderId, setAssociatedFolderId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [fileSize] = useState(524288); // 512 KB simulation

  // Folder Form State
  const [folderName, setFolderName] = useState("");
  const [folderClientId, setFolderClientId] = useState("");
  const [folderDesc, setFolderDesc] = useState("");

  const categories: DocumentCategory[] = isEmployee
    ? ["Client", "PAN", "GST", "CIN", "Employee", "Project", "Task", "Workflow", "Other"]
    : [
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

  const handleTabSwitch = (tab: "active" | "recycle-bin") => {
    setCurrentTab(tab);
    if (tab === "recycle-bin") {
      navigate("/recycle-bin", { replace: true });
    } else {
      navigate("/documents", { replace: true });
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(search.toLowerCase()) ||
      doc.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === "ALL" || doc.category === selectedCategory;
    const matchesFolder = selectedFolderId === "ALL" || doc.folder_id === selectedFolderId;

    return matchesSearch && matchesCategory && matchesFolder;
  });

  const filteredRecycleDocs = recycleBin.documents.filter((d) => {
    const matchesSearch =
      !search.trim() ||
      d.file_name.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = recycleBinFilter === "ALL" || recycleBinFilter === "DOCUMENT";
    return matchesSearch && matchesType;
  });

  const filteredRecycleFolders = recycleBin.folders.filter((f) => {
    const matchesSearch =
      !search.trim() ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = recycleBinFilter === "ALL" || recycleBinFilter === "FOLDER";
    return matchesSearch && matchesType;
  });

  const expiringSoonCount =
    recycleBin.documents.filter((d) => getDaysRemaining(d.recovery_deadline, d.deleted_at) <= 5).length +
    recycleBin.folders.filter((f) => getDaysRemaining(f.recovery_deadline, f.deleted_at) <= 5).length;

  // Actions
  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      toast.error("Please specify a document title or file name.");
      return;
    }

    const client = clients.find((c) => c.id === associatedClientId);
    const chosenFolder = folders.find((f) => f.id === associatedFolderId);
    const objectKey = chosenFolder
      ? `${chosenFolder.path.replace(/^\//, "")}/${fileName.replace(/\s+/g, "_")}`
      : `clients/${client?.client_code || "general"}/${fileName.replace(/\s+/g, "_")}`;

    pmsStore.addDocument({
      bucket_name: "pms-documents",
      r2_object_key: objectKey,
      file_name: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
      file_size: fileSize,
      mime_type: "application/pdf",
      category: fileCategory,
      entity_type: "client",
      entity_id: associatedClientId,
      folder_id: associatedFolderId || undefined,
      folder_name: chosenFolder?.name,
      uploaded_by: pmsStore.getCurrentUser().id,
      uploaded_by_name: pmsStore.getCurrentUser().full_name,
      version_number: 1,
      expiry_date: expiryDate || undefined,
    });

    toast.success(`Document uploaded to Cloudflare R2 bucket: ${objectKey}`);
    setIsUploadModalOpen(false);
    setFileName("");
    setAssociatedFolderId("");
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast.error("Please provide a folder name.");
      return;
    }

    const created = pmsStore.addDocumentFolder({
      name: folderName.trim(),
      client_id: folderClientId || undefined,
      description: folderDesc.trim(),
    });

    toast.success(`Folder "${created.name}" created.`);
    setIsFolderModalOpen(false);
    setFolderName("");
    setFolderClientId("");
    setFolderDesc("");
  };

  const handleDownload = (doc: FileObject) => {
    toast.success(`Generated presigned R2 secure URL for ${doc.file_name} (Expires in 60m)`);
  };

  const handleConfirmSoftDelete = () => {
    if (!softDeleteTarget) return;
    if (softDeleteTarget.type === "document") {
      pmsStore.softDeleteDocument(softDeleteTarget.id, currentUser);
      toast.success(
        `Moved "${softDeleteTarget.name}" to Recycle Bin. You can restore it within 25 days.`
      );
    } else {
      pmsStore.softDeleteFolder(softDeleteTarget.id, currentUser);
      toast.success(
        `Moved folder "${softDeleteTarget.name}" to Recycle Bin. Retained for 25 days.`
      );
    }
    setSoftDeleteTarget(null);
  };

  const handleRestore = (item: { type: "document" | "folder"; id: string; name: string }) => {
    if (item.type === "document") {
      pmsStore.restoreDocument(item.id, currentUser);
      toast.success(`Restored "${item.name}" back to Active Documents.`);
    } else {
      pmsStore.restoreFolder(item.id, currentUser);
      toast.success(`Restored folder "${item.name}" and contained documents.`);
    }
  };

  const handleRestoreAll = () => {
    const count = pmsStore.restoreAllRecycleBin(currentUser);
    toast.success(`Restored all ${count} item(s) from Recycle Bin back to repository.`);
  };

  const handleExecutePermanentDelete = () => {
    if (!permDeleteTarget || !isPermDeleteMatch) return;

    if (permDeleteTarget.type === "all") {
      const purged = pmsStore.emptyRecycleBin(currentUser);
      toast.success(`Emptied Recycle Bin: Permanently purged ${purged} item(s).`);
    } else if (permDeleteTarget.type === "document" && permDeleteTarget.id) {
      pmsStore.permanentlyDeleteDocument(permDeleteTarget.id, currentUser);
      toast.success(`Permanently deleted document "${permDeleteTarget.name}".`);
    } else if (permDeleteTarget.type === "folder" && permDeleteTarget.id) {
      pmsStore.permanentlyDeleteFolder(permDeleteTarget.id, currentUser);
      toast.success(`Permanently purged folder "${permDeleteTarget.name}".`);
    }

    setPermDeleteTarget(null);
    setPermDeleteInput("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* HEADER & CENTRALIZED RECOVERY NAVIGATION                                  */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              Cloud Document Storage &amp; Recovery
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Private, encrypted object storage for client KYC, audits, workpapers, and a centralized 25-day recovery system.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-300">
          <button
            type="button"
            onClick={() => handleTabSwitch("active")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === "active"
                ? "bg-white text-[#111827] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <span>Active Repository</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {documents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch("recycle-bin")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === "recycle-bin"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Trash2 className="h-4 w-4" />
            <span>Recycle Bin</span>
            {recycleBin.totalCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  currentTab === "recycle-bin"
                    ? "bg-white text-rose-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {recycleBin.totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: ACTIVE REPOSITORY                                                 */}
      {/* ========================================================================= */}
      {currentTab === "active" && (
        <div className="space-y-6">
          {/* Top Actions & Cloud Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-bold gap-1 py-1 px-2.5 rounded-xl"
              >
                <Cloud className="h-3.5 w-3.5 text-emerald-600" />
                <span>Cloudflare R2 Encrypted</span>
              </Badge>
              <Badge
                variant="outline"
                className="bg-slate-50 text-slate-700 border-slate-300 text-xs font-bold gap-1 py-1 px-2.5 rounded-xl"
              >
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>25-Day Recycle Recovery Active</span>
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {!isEmployee && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFolderModalOpen(true)}
                    size="sm"
                    className="h-9 rounded-xl border-slate-300 bg-white text-xs font-bold gap-1.5 shadow-xs"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span>New Folder</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    size="sm"
                    className="h-9 bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-xl shadow-xs text-xs font-bold"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>Upload Document</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Document Folders Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Document Folders ({folders.length})
              </span>
              {selectedFolderId !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedFolderId("ALL")}
                  className="text-xs text-blue-600 font-bold hover:underline"
                >
                  Clear folder filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {folders.map((fld) => {
                const folderDocs = documents.filter((d) => d.folder_id === fld.id);
                const isSelected = selectedFolderId === fld.id;

                return (
                  <div
                    key={fld.id}
                    onClick={() => setSelectedFolderId(isSelected ? "ALL" : fld.id)}
                    className={`rounded-2xl border-[1.5px] p-4 cursor-pointer transition-all flex flex-col justify-between space-y-3 bg-white ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-500/20 shadow-md"
                        : "border-slate-300 hover:border-slate-400 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}
                        >
                          <Folder className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-[#111827] truncate">
                            {fld.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {fld.path}
                          </span>
                        </div>
                      </div>

                      {!isEmployee && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSoftDeleteTarget({
                              type: "folder",
                              id: fld.id,
                              name: fld.name,
                            });
                          }}
                          className="h-6 w-6 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0 transition-colors"
                          title="Move folder to Recycle Bin (25 days retention)"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">
                        {folderDocs.length} {folderDocs.length === 1 ? "file" : "files"}
                      </span>
                      {isSelected && (
                        <span className="font-extrabold text-blue-600 text-[10px]">Filtering</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Filter Pills & Search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === "ALL"
                    ? "bg-[#111827] text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Categories ({documents.length})
              </button>
              {categories.map((cat) => {
                const count = documents.filter((d) => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                      selectedCategory === cat
                        ? "bg-[#111827] text-white font-bold"
                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{cat}</span>
                    {count > 0 && <span className="text-[10px] opacity-75">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-xs">
              <CardContent className="p-3.5">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search documents by file name, category, or path..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Documents Box View */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-extrabold text-[#111827]">
              Document Repository ({filteredDocs.length})
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Encrypted Cloudflare R2 Objects
            </span>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white p-14 text-center space-y-3">
              <FileText className="h-10 w-10 mx-auto text-slate-300" />
              <h3 className="text-sm font-extrabold text-[#111827]">No documents found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active documents match your search criteria or folder filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <Card
                  key={doc.id}
                  className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-xs hover:border-neutral-900 transition-all flex flex-col justify-between"
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
                      <span className="font-mono text-[10px] font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg">
                        v{doc.version_number}.0
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-[#111827] truncate">
                        {doc.file_name}
                      </h3>
                      <p className="font-mono text-[10px] text-slate-500 mt-1 truncate">
                        r2://{doc.bucket_name}/{doc.r2_object_key}
                      </p>
                      {doc.folder_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mt-1.5 border border-blue-100">
                          <Folder className="h-2.5 w-2.5" />
                          <span>{doc.folder_name}</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-slate-50/80 border border-slate-200 p-3 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          File Size
                        </span>
                        <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                          {formatBytes(doc.file_size)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Uploaded
                        </span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                      <span className="text-[11px] text-slate-500 truncate">
                        By <strong className="text-slate-800">{doc.uploaded_by_name}</strong>
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          onClick={() => handleDownload(doc)}
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs rounded-xl border-slate-300"
                        >
                          <Download className="h-3.5 w-3.5 text-blue-600" />
                          <span>Signed URL</span>
                        </Button>

                        {!isEmployee && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setSoftDeleteTarget({
                                type: "document",
                                id: doc.id,
                                name: doc.file_name,
                              })
                            }
                            className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Move to Recycle Bin (25 days retention)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: RECYCLE BIN & 25-DAY RETENTION ENGINE                             */}
      {/* ========================================================================= */}
      {currentTab === "recycle-bin" && (
        <div className="space-y-6">
          {/* Policy Banner */}
          <Card className="rounded-[24px] border-[1.5px] border-rose-300 bg-rose-50/70 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-rose-950">
                    Recycle Bin: Centralized Recovery &amp; Audit-Controlled System
                  </h3>
                  <Badge className="bg-rose-600 text-white text-[10px] font-extrabold">
                    25-Day Retention
                  </Badge>
                </div>
                <p className="text-xs text-rose-900 leading-relaxed max-w-4xl">
                  A centralized recovery system that temporarily stores deleted documents and folders, allowing authorized users to restore them within <strong>25 days</strong> or permanently delete them with proper authorization. All actions are tracked through audit logs to ensure data security and accountability.
                </p>
              </div>
            </div>
          </Card>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-2xl border border-slate-300 bg-white p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Recoverable Items
              </span>
              <span className="text-2xl font-extrabold text-slate-900">
                {recycleBin.totalCount}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {recycleBin.documents.length} docs · {recycleBin.folders.length} folders
              </span>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-white p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Retention Window
              </span>
              <span className="text-2xl font-extrabold text-blue-700">25 Days</span>
              <span className="text-[11px] text-slate-500 block">Auto-purge upon expiry</span>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-white p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Expiring Soon (&le; 5 Days)
              </span>
              <span
                className={`text-2xl font-extrabold ${
                  expiringSoonCount > 0 ? "text-amber-600" : "text-emerald-700"
                }`}
              >
                {expiringSoonCount}
              </span>
              <span className="text-[11px] text-slate-500 block">Action recommended</span>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-white p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Audit Trail Status
              </span>
              <span className="text-2xl font-extrabold text-emerald-700">100% Tracked</span>
              <span className="text-[11px] text-slate-500 block">Logged to security ledger</span>
            </div>
          </div>

          {/* Recycle Bin Controls & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecycleBinFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  recycleBinFilter === "ALL"
                    ? "bg-[#111827] text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All ({recycleBin.totalCount})
              </button>
              <button
                type="button"
                onClick={() => setRecycleBinFilter("DOCUMENT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  recycleBinFilter === "DOCUMENT"
                    ? "bg-[#111827] text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Documents ({recycleBin.documents.length})
              </button>
              <button
                type="button"
                onClick={() => setRecycleBinFilter("FOLDER")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  recycleBinFilter === "FOLDER"
                    ? "bg-[#111827] text-white"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Folders ({recycleBin.folders.length})
              </button>
            </div>

            {canAdminRecycleBin && recycleBin.totalCount > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreAll}
                  className="rounded-xl border-slate-300 text-xs font-bold gap-1.5 h-9"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Restore All Items</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setPermDeleteTarget({
                      type: "all",
                      name: "EMPTY RECYCLE BIN",
                    });
                    setPermDeleteInput("");
                  }}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 h-9"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Empty Recycle Bin</span>
                </Button>
              </div>
            )}
          </div>

          {/* Search bar inside Recycle Bin */}
          <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-xs">
            <CardContent className="p-3.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search deleted files or folders in Recycle Bin..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recycle Bin Items List */}
          {recycleBin.totalCount === 0 ? (
            <div className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white p-14 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
              <h3 className="text-base font-extrabold text-[#111827]">Recycle Bin is Empty</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No documents or folders currently in recovery. All deleted items will be held here safely for 25 days before permanent deletion.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Folders in Recycle Bin */}
              {filteredRecycleFolders.map((fld) => {
                const daysLeft = getDaysRemaining(fld.recovery_deadline, fld.deleted_at);

                return (
                  <Card
                    key={fld.id}
                    className="rounded-[24px] border-[1.5px] border-rose-200 bg-white shadow-xs p-5 space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                            <Folder className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                                Folder
                              </span>
                            </div>
                            <h4 className="text-sm font-extrabold text-[#111827] truncate mt-0.5">
                              {fld.name}
                            </h4>
                          </div>
                        </div>

                        {/* Days Left Badge */}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-extrabold rounded-full px-2.5 py-0.5 shrink-0 ${
                            daysLeft > 10
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : daysLeft > 3
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {daysLeft} days left
                        </Badge>
                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[11px] space-y-1 text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Path:</span>
                          <span className="font-mono text-slate-700 font-semibold truncate max-w-[180px]">
                            {fld.path}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Deleted By:</span>
                          <span className="font-semibold text-slate-800">
                            {fld.deleted_by_name || "Authorized User"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Deleted At:</span>
                          <span className="font-medium text-slate-700">
                            {formatDate(fld.deleted_at || fld.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore({ type: "folder", id: fld.id, name: fld.name })}
                        className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold gap-1 h-8"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restore Folder</span>
                      </Button>

                      {canAdminRecycleBin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPermDeleteTarget({
                              type: "folder",
                              id: fld.id,
                              name: fld.name,
                            });
                            setPermDeleteInput("");
                          }}
                          className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold gap-1 h-8"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete Permanently</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}

              {/* Documents in Recycle Bin */}
              {filteredRecycleDocs.map((doc) => {
                const daysLeft = getDaysRemaining(doc.recovery_deadline, doc.deleted_at);

                return (
                  <Card
                    key={doc.id}
                    className="rounded-[24px] border-[1.5px] border-rose-200 bg-white shadow-xs p-5 space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full border border-slate-200">
                                {doc.category}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                v{doc.version_number}.0
                              </span>
                            </div>
                            <h4 className="text-sm font-extrabold text-[#111827] truncate mt-0.5">
                              {doc.file_name}
                            </h4>
                          </div>
                        </div>

                        {/* Days Left Badge */}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-extrabold rounded-full px-2.5 py-0.5 shrink-0 ${
                            daysLeft > 10
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : daysLeft > 3
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {daysLeft} days left
                        </Badge>
                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-[11px] space-y-1 text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">File Size:</span>
                          <span className="font-mono text-slate-800 font-semibold">
                            {formatBytes(doc.file_size)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Deleted By:</span>
                          <span className="font-semibold text-slate-800">
                            {doc.deleted_by_name || "Authorized User"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Deleted At:</span>
                          <span className="font-medium text-slate-700">
                            {formatDate(doc.deleted_at || doc.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore({ type: "document", id: doc.id, name: doc.file_name })}
                        className="rounded-xl border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold gap-1 h-8"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restore</span>
                      </Button>

                      {canAdminRecycleBin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setPermDeleteTarget({
                              type: "document",
                              id: doc.id,
                              name: doc.file_name,
                            });
                            setPermDeleteInput("");
                          }}
                          className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold gap-1 h-8"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete Permanently</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE DOCUMENT FOLDER                                             */}
      {/* ========================================================================= */}
      {!isEmployee && (
        <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
          <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Create Document Folder
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Organize client workpapers, statutory filings, and audit evidence into encrypted folder paths.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateFolder} className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Folder Name *</label>
                <Input
                  placeholder="e.g. Statutory Audit 2026, GST Returns, Client KYC"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Associated Client (Optional)</label>
                <select
                  value={folderClientId}
                  onChange={(e) => setFolderClientId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="">General Firm Practice (No Client)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.client_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <Textarea
                  placeholder="Brief note about the documents to be placed in this folder..."
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFolderModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-neutral-900 hover:bg-black text-white">
                  Create Folder
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD DOCUMENT TO R2                                              */}
      {/* ========================================================================= */}
      {!isEmployee && (
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300">
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
                <label className="text-xs font-semibold text-slate-700">Document Title / File Name *</label>
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
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Associated Client</label>
                  <select
                    value={associatedClientId}
                    onChange={(e) => setAssociatedClientId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.client_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Target Folder (Optional)</label>
                <select
                  value={associatedFolderId}
                  onChange={(e) => setAssociatedFolderId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="">Root / Direct Upload</option>
                  {folders.map((fld) => (
                    <option key={fld.id} value={fld.id}>
                      {fld.name} ({fld.path})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Expiry Date (Optional for licenses / certs)
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50/70">
                <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700">Choose file or drag &amp; drop</p>
                <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOCX, XLSX, JPG up to 50MB</p>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-neutral-900 hover:bg-black text-white">
                  Upload to R2
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SOFT-DELETE (MOVE TO RECYCLE BIN) CONFIRMATION                      */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(softDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setSoftDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300 p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <ArchiveRestore className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-[#111827]">
                  Move to Recycle Bin?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  25-day recovery window enabled
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-600">
            <p>
              Are you sure you want to move{" "}
              <strong className="text-slate-900">&ldquo;{softDeleteTarget?.name}&rdquo;</strong> to the Recycle Bin?
            </p>
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 space-y-1 text-blue-900">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="h-4 w-4 text-blue-600" />
                <span>25-Day Safe Recovery Window</span>
              </div>
              <p className="text-[11px] text-blue-800">
                This item will not be deleted immediately. It will be safely retained in the Recycle Bin for 25 days, where any authorized user can restore it anytime.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSoftDeleteTarget(null)}
              className="rounded-xl border-slate-300 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSoftDelete}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Move to Recycle Bin</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: PERMANENT PURGE DOUBLE-VERIFICATION                                */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(permDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPermDeleteTarget(null);
            setPermDeleteInput("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300 p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-[#111827]">
                  {permDeleteTarget?.type === "all"
                    ? "Permanently Empty Recycle Bin?"
                    : "Permanently Delete Item?"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  This action is irreversible and recorded in the security audit logs.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              {permDeleteTarget?.type === "all"
                ? "This will permanently purge all deleted documents and folders from storage. They cannot be recovered after this action."
                : `Are you sure you want to permanently delete "${permDeleteTarget?.name}"? It will be completely removed from storage.`}
            </p>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
              <p className="text-xs font-semibold text-rose-900">
                To confirm permanent deletion, please type below:
              </p>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs font-mono font-extrabold text-rose-800 select-all break-all shadow-xs">
                {permDeleteTarget?.type === "all" ? "EMPTY RECYCLE BIN" : permDeleteTarget?.name}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Type Title to Verify</label>
              <Input
                value={permDeleteInput}
                onChange={(e) => setPermDeleteInput(e.target.value)}
                placeholder={`Type exactly to confirm`}
                className="text-xs h-10 rounded-xl border-slate-300 font-medium focus-visible:ring-rose-500"
                autoFocus
              />
              {permDeleteInput && !isPermDeleteMatch && (
                <p className="text-[11px] font-semibold text-rose-600">
                  Input does not match. Please type it exactly as shown above.
                </p>
              )}
              {isPermDeleteMatch && (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Authorization verified. Ready to permanently purge.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPermDeleteTarget(null);
                setPermDeleteInput("");
              }}
              className="rounded-xl border-slate-300 text-xs font-bold h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isPermDeleteMatch}
              onClick={handleExecutePermanentDelete}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>
                {permDeleteTarget?.type === "all" ? "Empty All Items" : "Permanently Delete"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <React.Suspense
      fallback={<div className="p-8 text-center text-slate-500">Loading documents &amp; recovery bin...</div>}
    >
      <DocumentsContent />
    </React.Suspense>
  );
}
