import React, { useRef, useState } from "react";
import { Download, FileText, Paperclip, Plus, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pmsStore } from "@/lib/data/store";
import { isEmployeeRestricted } from "@/lib/access";
import { FileObject, Task } from "@/types";
import { UpgradeModal } from "@/components/subscription/upgrade-modal";
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TaskDocumentsBoxProps {
  task: Task;
  onChanged?: () => void;
  readOnly?: boolean;
}

export function TaskDocumentsBox({ task, onChanged, readOnly }: TaskDocumentsBoxProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docs = pmsStore.getDocumentsByEntity("task", task.id);
  const isReadOnly = readOnly ?? isEmployeeRestricted(pmsStore.getCurrentUser());

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    toast.error("Document Storing is closed on the Free Trial Version. Upgrade to Access.");
    setUpgradeModalOpen(true);
    e.target.value = "";
  };

  const handleDownloadDoc = (doc: FileObject) => {
    if (doc.download_url) {
      const a = document.createElement("a");
      a.href = doc.download_url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloading ${doc.file_name}`);
    } else {
      toast.info(`${doc.file_name} metadata stored (${doc.r2_object_key}).`);
    }
  };

  return (
    <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Paperclip className="h-4 w-4 text-sky-600" />
          <span>Documents ({docs.length})</span>
        </h4>

        {!isReadOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setUpgradeModalOpen(true)}
              className="h-8 px-3 rounded-xl border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold gap-1 hover:bg-amber-100 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-amber-600" />
              <span>Upload Document</span>
              <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-extrabold uppercase">Upgrade</span>
            </Button>
          </>
        )}
      </div>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        feature="documents"
      />

      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
          No documents attached to {task.task_code}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-[#19196f] shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{doc.file_name}</div>
                  <div className="text-[10px] text-slate-500">
                    {formatFileSize(doc.file_size)} &bull; {doc.uploaded_by_name || "User"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(doc)}
                  className="p-1 text-slate-500 hover:text-[#19196f] rounded"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      pmsStore.deleteDocument(doc.id);
                      toast.success(`Removed ${doc.file_name}`);
                      onChanged?.();
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Remove Document"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

