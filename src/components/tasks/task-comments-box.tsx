import React, { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, CheckCheck, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { pmsStore } from "@/lib/data/store";
import { isAdminUser } from "@/lib/access";
import { Employee } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function renderCommentWithMentions(text: string, employees: Employee[]): React.ReactNode {
  const names = employees
    .map((e) => e.full_name?.trim())
    .filter((n): n is string => Boolean(n))
    .sort((a, b) => b.length - a.length);

  if (names.length === 0) return text;

  const pattern = new RegExp(`(@(?:${names.map(escapeRegExp).join("|")}))`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, idx) => {
    if (part.startsWith("@") && names.some((n) => `@${n}`.toLowerCase() === part.toLowerCase())) {
      return (
        <span
          key={idx}
          className="inline-block rounded-md bg-violet-100 text-violet-800 font-bold px-1.5 py-0.5 mx-0.5"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface ActiveMentionQuery {
  startIndex: number;
  endIndex: number;
  query: string;
}

function detectActiveMention(text: string, caretIndex: number, employees: Employee[]): ActiveMentionQuery | null {
  const beforeCaret = text.slice(0, caretIndex);
  // Skip opening the picker if the cursor is right after an already completed "@Name "
  const alreadyCompleted = employees.some((emp) =>
    emp.full_name && beforeCaret.toLowerCase().endsWith(`@${emp.full_name.toLowerCase()} `)
  );
  if (alreadyCompleted) return null;

  const match = beforeCaret.match(/(?:^|\s)@([^\n@]{0,40})$/);
  if (!match) return null;

  const query = match[1];
  const atOffset = beforeCaret.lastIndexOf("@");
  if (atOffset < 0) return null;

  return {
    startIndex: atOffset,
    endIndex: caretIndex,
    query,
  };
}

interface TaskCommentsBoxProps {
  taskId: string;
  assignedEmployeeId?: string;
  onUpdated?: () => void;
  readOnly?: boolean;
}

export function TaskCommentsBox({
  taskId,
  assignedEmployeeId,
  onUpdated,
  readOnly,
}: TaskCommentsBoxProps) {
  const [, setTick] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [caretPos, setCaretPos] = useState(0);
  const [mentionDismissedAt, setMentionDismissedAt] = useState<number | null>(null);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [expandedReadersId, setExpandedReadersId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const comments = pmsStore.getTaskComments(taskId);
  const currentUser = pmsStore.getCurrentUser();
  const isAdmin = isAdminUser(currentUser);
  const isReadOnly = readOnly ?? !isAdmin;
  const employees = pmsStore.getEmployees();

  // Auto-mark comments as Seen by the active user as soon as they view them
  useEffect(() => {
    if (taskId) {
      const changed = pmsStore.markTaskCommentsRead(taskId);
      if (changed) {
        onUpdated?.();
      }
    }
  }, [taskId, comments.length, currentUser?.id]);

  const activeMention = useMemo(() => {
    const detected = detectActiveMention(commentText, caretPos, employees);
    if (!detected) return null;
    if (mentionDismissedAt !== null && detected.startIndex === mentionDismissedAt) {
      return null;
    }
    return detected;
  }, [commentText, caretPos, employees, mentionDismissedAt]);

  const mentionSuggestions = useMemo(() => {
    if (!activeMention) return [];
    const q = activeMention.query.trim().toLowerCase();
    return employees
      .filter((emp) => emp.is_active)
      .filter((emp) => {
        if (!q) return true;
        return (
          emp.full_name.toLowerCase().includes(q) ||
          emp.employee_code.toLowerCase().includes(q) ||
          (emp.designation_name && emp.designation_name.toLowerCase().includes(q)) ||
          (emp.role_code && emp.role_code.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [activeMention, employees]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [activeMention?.query, activeMention?.startIndex]);

  const handleInsertMention = (emp: Employee) => {
    if (!activeMention) return;
    const before = commentText.slice(0, activeMention.startIndex);
    const after = commentText.slice(activeMention.endIndex);
    const inserted = `@${emp.full_name} `;
    const nextText = `${before}${inserted}${after}`;
    const nextCaret = before.length + inserted.length;

    setCommentText(nextText);
    setCaretPos(nextCaret);
    setMentionDismissedAt(null);
    setSelectedMentionIds((prev) => (prev.includes(emp.id) ? prev : [...prev, emp.id]));

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCaret, nextCaret);
      }
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommentText(e.target.value);
    setCaretPos(e.target.selectionStart ?? e.target.value.length);
    setMentionDismissedAt(null);
  };

  const syncCaret = () => {
    if (textareaRef.current) {
      setCaretPos(textareaRef.current.selectionStart ?? commentText.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeMention || mentionSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % mentionSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const picked = mentionSuggestions[highlightIdx] || mentionSuggestions[0];
      if (picked) handleInsertMention(picked);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMentionDismissedAt(activeMention.startIndex);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    pmsStore.addTaskComment(taskId, commentText.trim(), selectedMentionIds);
    setCommentText("");
    setCaretPos(0);
    setSelectedMentionIds([]);
    setMentionDismissedAt(null);
    toast.success("Comment posted.");
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
          {isAdmin ? "Seen list (Admin)" : "Auto-marked Seen"}
        </span>
      </div>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
          {isReadOnly
            ? "No comments posted on this task."
            : "No comments on this task yet. Add notes, review feedback, or client clarifications below."}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {comments.map((c) => {
            const readBy = c.read_by || [];
            const otherReaders = readBy.filter((r) => r.employee_id !== c.employee_id);
            const hasBeenSeenByOthers = otherReaders.length > 0;
            const currentUserHasSeen = readBy.some((r) => r.employee_id === currentUser?.id);
            const isExpanded = isAdmin && expandedReadersId === c.id;

            // Pending readers shown only in Admin view
            const pendingEmployees = employees.filter(
              (emp) =>
                emp.is_active &&
                (emp.id === assignedEmployeeId || emp.id !== c.employee_id) &&
                !readBy.some((r) => r.employee_id === emp.id)
            );

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-300 bg-slate-50/80 p-3 space-y-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#111827]">{c.employee_name}</span>
                  <span className="text-[10px] text-slate-500">{formatDateTime(c.created_at)}</span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {renderCommentWithMentions(c.comment, employees)}
                </p>

                {/* Read Receipt Footer: full Seen list is Admin-only; employees only see Seen status with no option to mark unseen */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 text-[10px]">
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpandedReadersId(isExpanded ? null : c.id)}
                        className={`inline-flex items-center gap-1 font-semibold transition-colors ${
                          hasBeenSeenByOthers ? "text-sky-700" : "text-slate-600"
                        }`}
                        title="Click to view full Seen list (Admin only)"
                      >
                        <CheckCheck
                          className={`h-3.5 w-3.5 ${
                            hasBeenSeenByOthers ? "text-sky-600" : "text-slate-400"
                          }`}
                        />
                        <span>
                          {readBy.length > 0
                            ? `Seen by ${readBy.map((r) => r.employee_name).join(", ")}`
                            : "Not seen yet"}
                        </span>
                      </button>

                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                        <CheckCheck className="h-3 w-3" />
                        <span>{currentUserHasSeen ? "Seen" : "Marked Seen"}</span>
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 ml-auto">
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span>{currentUserHasSeen ? "Seen" : "Marked Seen"}</span>
                    </span>
                  )}
                </div>

                {isAdmin && isExpanded && (
                  <div className="rounded-xl bg-white border border-slate-200 p-2.5 text-[10px] space-y-1.5">
                    <div className="font-bold uppercase tracking-wider text-slate-500">
                      Seen List ({readBy.length})
                    </div>
                    {readBy.length === 0 ? (
                      <div className="text-slate-400">No users have seen this message yet.</div>
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
                    {pendingEmployees.length > 0 && (
                      <div className="pt-1 border-t border-slate-100 text-slate-500">
                        Not seen yet:{" "}
                        <span className="font-medium text-amber-700">
                          {pendingEmployees.map((p) => p.full_name).join(", ")}
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

      {!isReadOnly && (
      <form
        onSubmit={handleAddComment}
        className="relative flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200"
      >
        <div className="relative flex-1">
          {activeMention && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1.5 z-30 rounded-2xl border-[1.5px] border-slate-300 bg-white shadow-xl p-1.5 max-h-52 overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <AtSign className="h-3 w-3 text-violet-600" />
                <span>Mention team member (Enter or click to select)</span>
              </div>
              {mentionSuggestions.map((emp, idx) => (
                <button
                  key={emp.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertMention(emp);
                  }}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors ${
                    idx === highlightIdx
                      ? "bg-violet-50 text-violet-900"
                      : "hover:bg-slate-50 text-[#111827]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-6 w-6 rounded-lg bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {emp.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="font-bold truncate">{emp.full_name}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                    {emp.employee_code} &bull; {emp.designation_name || emp.role_code}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Textarea
            ref={textareaRef}
            placeholder="Write a comment... Type @ to mention a person"
            value={commentText}
            onChange={handleTextChange}
            onClick={syncCaret}
            onKeyUp={syncCaret}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full rounded-2xl border-[1.5px] border-slate-300 text-xs"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="sm:self-end h-10 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1.5 shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Post Comment</span>
        </Button>
      </form>
      )}
    </div>
  );
}
