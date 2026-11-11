import React, { useRef } from "react";
import { Download, FileText, Paperclip, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pmsStore } from "@/lib/data/store";
import { FileObject, Task } from "@/types";
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TaskDocumentsBoxProps {
  task: Task;
  onChanged?: () => void;
}

export function TaskDocumentsBox({ task, onChanged }: TaskDocumentsBoxProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docs = pmsStore.getDocumentsByEntity("task", task.id);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentUser = pmsStore.getCurrentUser();
    for (const file of files) {
      let dataUrl: string | undefined;
      if (file.size <= 1.5 * 1024 * 1024) {
        dataUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === "string" ? reader.result : undefined);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
      }

      pmsStore.addDocument({
        bucket_name: "pms-documents",
        r2_object_key: `tasks/${task.project_id}/${task.task_code}/${file.name.replace(/\s+/g, "_")}`,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        category: "Task",
        entity_type: "task",
        entity_id: task.id,
        uploaded_by: currentUser?.id,
        uploaded_by_name: currentUser?.full_name || "System User",
        version_number: 1,
        download_url: dataUrl,
      });
    }

    toast.success(`Uploaded ${files.length} document(s) to ${task.task_code}.`);
    e.target.value = "";
    onChanged?.();
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
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-3 rounded-xl border-slate-300 text-xs font-bold gap-1 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5 text-sky-600" />
          <span>Upload Document</span>
        </Button>
      </div>

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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

