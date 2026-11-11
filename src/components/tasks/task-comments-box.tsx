import React, { useEffect, useState } from "react";
import { CheckCheck, Eye, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { pmsStore } from "@/lib/data/store";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface TaskCommentsBoxProps {
  taskId: string;
  assignedEmployeeId?: string;
  onUpdated?: () => void;
}

export function TaskCommentsBox({
  taskId,
  assignedEmployeeId,
  onUpdated,
}: TaskCommentsBoxProps) {
  const [, setTick] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [expandedReadersId, setExpandedReadersId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const comments = pmsStore.getTaskComments(taskId);
  const currentUser = pmsStore.getCurrentUser();
  const employees = pmsStore.getEmployees();

  // Auto-mark comments as read by the current active user when viewing comments
  useEffect(() => {
    if (taskId) {
      const changed = pmsStore.markTaskCommentsRead(taskId);
      if (changed) {
        onUpdated?.();
      }
    }
  }, [taskId, comments.length]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    pmsStore.addTaskComment(taskId, commentText.trim());
    setCommentText("");
    toast.success("Comment posted.");
    onUpdated?.();
  };

  const handleToggleMyRead = (commentId: string) => {
    if (!currentUser) return;
    pmsStore.toggleCommentReadReceipt(commentId, {
      id: currentUser.id,
      full_name: currentUser.full_name,
    });
    setTick((t) => t + 1);
    onUpdated?.();
  };

  return (
    <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-sky-600" />
          <span>Task Comments ({comments.length})</span>
        </h4>
        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
          <CheckCheck className="h-3.5 w-3.5 text-sky-600" />
          Read receipts active
        </span>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
          No comments on this task yet. Add notes, review feedback, or client clarifications below.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {comments.map((c) => {
            const readBy = c.read_by || [];
            const otherReaders = readBy.filter((r) => r.employee_id !== c.employee_id);
            const hasBeenReadByRecipient = otherReaders.length > 0;
            const currentUserHasRead = readBy.some((r) => r.employee_id === currentUser?.id);
            const isExpanded = expandedReadersId === c.id;

            // Show pending recipients from task assignee / team if not yet read
            const pendingAssignees = employees.filter(
              (emp) =>
                (emp.id === assignedEmployeeId ||
                  emp.role_code === "SUPER_ADMIN" ||
                  emp.role_code === "DIRECTOR" ||
                  emp.role_code === "SUPERVISOR") &&
                emp.id !== c.employee_id &&
                !readBy.some((r) => r.employee_id === emp.id)
            );

            return (
              <div
                key={c.id}
                className={`rounded-2xl border p-3 space-y-2 transition-colors ${
                  currentUserHasRead
                    ? "border-slate-300 bg-slate-50/80"
                    : "border-sky-300 bg-sky-50/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#111827]">{c.employee_name}</span>
                    {!currentUserHasRead && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-600 text-white">
                        Unread
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500">{formatDateTime(c.created_at)}</span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {c.comment}
                </p>

                {/* Read Recipient Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setExpandedReadersId(isExpanded ? null : c.id)}
                    className={`inline-flex items-center gap-1 font-semibold transition-colors ${
                      hasBeenReadByRecipient ? "text-sky-700" : "text-slate-500"
                    }`}
                    title="Click to inspect full read receipts"
                  >
                    <CheckCheck
                      className={`h-3.5 w-3.5 ${
                        hasBeenReadByRecipient ? "text-sky-600" : "text-slate-400"
                      }`}
                    />
                    {readBy.length > 0 ? (
                      <span>
                        Read by{" "}
                        {readBy.map((r) => r.employee_name).join(", ")}
                      </span>
                    ) : (
                      <span>Not read yet</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleMyRead(c.id)}
                    className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-[#111827] px-1.5 py-0.5 rounded-md hover:bg-slate-200/60"
                  >
                    <Eye className="h-3 w-3" />
                    <span>{currentUserHasRead ? "Mark Unread" : "Mark Read"}</span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="rounded-xl bg-white border border-slate-200 p-2.5 text-[10px] space-y-1.5">
                    <div className="font-bold uppercase tracking-wider text-slate-500">
                      Read Receipts
                    </div>
                    {readBy.length === 0 ? (
                      <div className="text-slate-400">No recipients have read this comment yet.</div>
                    ) : (
                      <div className="space-y-1">
                        {readBy.map((r) => (
                          <div key={r.employee_id} className="flex items-center justify-between text-slate-700">
                            <span className="font-semibold inline-flex items-center gap-1">
                              <CheckCheck className="h-3 w-3 text-sky-600" />
                              {r.employee_name}
                            </span>
                            <span className="text-slate-400">{formatDateTime(r.read_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {pendingAssignees.length > 0 && (
                      <div className="pt-1 border-t border-slate-100 text-slate-500">
                        Pending read:{" "}
                        <span className="font-medium text-amber-700">
                          {pendingAssignees.map((p) => p.full_name).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <form
        onSubmit={handleAddComment}
        className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200"
      >
        <Textarea
          placeholder="Write a comment, status update, or review note for this task..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={2}
          className="flex-1 rounded-2xl border-[1.5px] border-slate-300 text-xs"
        />
        <Button
          type="submit"
          size="sm"
          className="sm:self-end h-10 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1.5 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Post Comment</span>
        </Button>
      </form>
    </div>
  );
}
